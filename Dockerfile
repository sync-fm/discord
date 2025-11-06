# Use official Bun image
FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
FROM base AS install
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy source code
FROM base AS build
COPY --from=install /app/node_modules ./node_modules
COPY . .

# Production stage
FROM base AS production
COPY --from=install /app/node_modules ./node_modules
COPY --from=build /app/src ./src
COPY --from=build /app/package.json ./

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["bun", "src/bot.ts"]
