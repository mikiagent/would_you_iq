FROM node:20-alpine AS builder

WORKDIR /app/wouldyouiq

COPY wouldyouiq/package*.json ./
RUN npm ci

COPY wouldyouiq ./

ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY

RUN npx expo export --platform web

FROM node:20-alpine AS runner

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/wouldyouiq/dist ./dist

ENV PORT=3000

EXPOSE 3000

CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
