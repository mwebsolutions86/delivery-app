# Dockerfile pour Delivery App (React Native/Expo)
FROM node:18-alpine

# Installation des dépendances système
RUN apk add --no-cache \
    git \
    openssh \
    && apk add --no-cache python3 \
    && apk add --no-cache make \
    && apk add --no-cache g++

# Installation globale d'Expo CLI
RUN npm install -g @expo/cli eas-cli

# Configuration du workspace
WORKDIR /app

# Copie des fichiers de configuration
COPY delivery-app/package.json delivery-app/package-lock.json* ./

# Installation des dépendances
RUN npm ci && npm cache clean --force

# Copie du code source
COPY delivery-app/ .

# Configuration des variables d'environnement
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
ENV NODE_ENV=production

# Configuration Expo
EXPOSE 19000
EXPOSE 19001

# Commandes de build et développement
CMD ["npx", "expo", "start", "--web"]

# Scripts personnalisés pour CI/CD
RUN echo '#!/bin/sh' > /app/build.sh && \
    echo 'echo "🏗️ Building Delivery App..."' >> /app/build.sh && \
    echo 'npx expo export:android --type apk' >> /app/build.sh && \
    echo 'npx expo export:ios --type archive' >> /app/build.sh && \
    chmod +x /app/build.sh

RUN echo '#!/bin/sh' > /app/test.sh && \
    echo 'echo "🧪 Testing Delivery App..."' >> /app/test.sh && \
    echo 'npm test' >> /app/test.sh && \
    chmod +x /app/test.sh