FROM golang:1.25-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN go build -o grpc-echo .

FROM alpine:3.20
COPY --from=builder /app/grpc-echo /grpc-echo
EXPOSE 50051
ENTRYPOINT ["/grpc-echo"]
