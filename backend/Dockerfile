# ==========================================================
# Multi-Stage Production Dockerfile for Go Backend
# ==========================================================

# Stage 1: Build stage
FROM golang:1.23-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build static binaries for API and background worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/worker ./cmd/worker

# Stage 2: Minimal runtime image
FROM alpine:3.20 AS runner

RUN apk add --no-cache ca-certificates tzdata curl

# Configure Asia/Kathmandu timezone by default
ENV TZ=Asia/Kathmandu
RUN cp /usr/share/zoneinfo/Asia/Kathmandu /etc/localtime && echo "Asia/Kathmandu" > /etc/timezone

# Create secure non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy binaries and migrations from builder
COPY --from=builder /bin/api /app/api
COPY --from=builder /bin/worker /app/worker
COPY --from=builder /app/db/migrations /app/db/migrations

# Set proper permissions
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=10s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

ENTRYPOINT ["/app/api"]
