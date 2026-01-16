# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ARG VITE_KAKAO_CLIENT_ID
ARG VITE_KAKAO_REDIRECT_URI
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_KAKAO_REDIRECT_URI=$VITE_KAKAO_REDIRECT_URI

RUN npm run build


# Run stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
