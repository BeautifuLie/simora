package service

import (
	"context"
	"sync"
)

// ContextHolder carries the Wails application context so services can derive
// properly-cancelled child contexts without exposing lifecycle methods on their
// public API (which would otherwise appear in the Wails JS/TS bindings).
//
// Usage:
//
//	holder := service.NewContextHolder()
//	svc    := service.NewGrpcService(holder)
//	// in app.startup:
//	holder.Set(ctx)
type ContextHolder struct {
	mu  sync.RWMutex
	ctx context.Context
}

func NewContextHolder() *ContextHolder {
	return &ContextHolder{ctx: context.Background()}
}

// Set stores the Wails runtime context. Called once from app.startup.
func (h *ContextHolder) Set(ctx context.Context) {
	h.mu.Lock()
	h.ctx = ctx
	h.mu.Unlock()
}

// Get returns the stored context.
func (h *ContextHolder) Get() context.Context {
	h.mu.RLock()
	defer h.mu.RUnlock()

	return h.ctx
}
