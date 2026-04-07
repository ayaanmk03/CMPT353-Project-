FROM node:20-alpine

WORKDIR /app

COPY next-app/package*.json ./next-app/
RUN cd next-app && npm install

COPY next-app ./next-app

# Create persistent directories mapping
RUN mkdir -p uploads data

WORKDIR /app/next-app
EXPOSE 3000

# Next.js telemetry disable
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build
CMD ["npm", "start"]
