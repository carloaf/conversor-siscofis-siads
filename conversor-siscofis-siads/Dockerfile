FROM node:14-alpine

# Set the working directory
WORKDIR /usr/src/app

# Instala dependências do sistema necessárias para pdfjs/canvas
RUN apk add --no-cache python3 make g++

# Copia apenas os arquivos de dependências primeiro (cache layer)
COPY package*.json ./

# Instala apenas dependências de produção
RUN npm install --only=production

# Copia o restante do código
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["node", "src/app.js"]