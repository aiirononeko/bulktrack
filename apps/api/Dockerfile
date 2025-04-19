# ---- Build stage ----
FROM golang:1.24-bookworm AS builder
WORKDIR /src
COPY . .
RUN go build -o /app ./apps/api/cmd/server

# ---- Run stage ----
FROM gcr.io/distroless/base-debian12
ENV PORT=8080
COPY --from=builder /app /app
ENTRYPOINT ["/app"]
