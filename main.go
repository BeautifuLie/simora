package main

import (
	"embed"
	"log"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"simora/backend/keyring"
	"simora/backend/service"
	"simora/backend/storage"
)

// Version is set at build time via -ldflags "-X main.Version=v1.2.3".
// Falls back to "dev" when building locally without a tag.
var Version = "dev"

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	appCtx := service.NewContextHolder()

	reqSvc, err := service.NewRequestService(appCtx)
	if err != nil {
		log.Fatalf("could not initialise request service: %v", err)
	}

	configDir, err := storage.ConfigDir()
	if err != nil {
		log.Fatalf("could not resolve config dir: %v", err)
	}

	kr := keyring.New(configDir)
	orgSvc := service.NewOrganizationService(storage.NewOrganization(), kr)
	collSvc := service.NewCollectionService(orgSvc, kr)

	grpcSvc := service.NewGrpcService(appCtx)
	kafkaSvc := service.NewKafkaService(appCtx)
	sqsSvc := service.NewSqsService(appCtx)
	wsSvc := service.NewWsService(appCtx)

	app := NewApp(appCtx)

	err = wails.Run(&options.App{
		Title:     "Simora",
		Width:     1280,
		Height:    800,
		MinWidth:  900,
		MinHeight: 600,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		BackgroundColour: &options.RGBA{R: 27, G: 38, B: 54, A: 1},
		OnStartup:        app.startup,
		Bind: []any{
			app,
			orgSvc,
			collSvc,
			reqSvc,
			kafkaSvc,
			service.NewSettingsService(),
			sqsSvc,
			grpcSvc,
			wsSvc,
		},
	})
	if err != nil {
		log.Fatalf("wails run: %v", err)
	}
}
