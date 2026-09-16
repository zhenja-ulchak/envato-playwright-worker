FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

COPY package.json .
RUN npm install --omit=dev

COPY server.js .

RUN mkdir -p /data/downloads /app/profile

EXPOSE 3000

CMD ["node", "server.js"]