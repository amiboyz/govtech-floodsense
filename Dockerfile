FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV APP_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/database ./database
COPY --from=build /app/docs/data\ invest ./docs/data\ invest
EXPOSE 8787
CMD ["node", "dist/server/index.js"]
