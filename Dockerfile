# GSC service image — the SAME image the cloud deployment runs (cloud-isomorphic).
# api and worker are different commands of this image (compose topology).
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV HOST=0.0.0.0
EXPOSE 8788
CMD ["node", "server/index.ts"]
