# Imagem super leve só para servir os arquivos já compilados localmente
FROM nginx:alpine

# Copia a pasta dist (que você vai enviar pro Github) para o Nginx
COPY dist /usr/share/nginx/html

# Configura o Nginx para suportar as rotas do React (SPA)
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
