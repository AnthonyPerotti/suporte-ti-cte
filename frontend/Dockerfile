# Imagem super leve só para servir os arquivos já compilados localmente
FROM nginx:alpine

# Copia a pasta dist (que você vai enviar pro Github) para o Nginx
COPY dist /usr/share/nginx/html

# Copia a configuração do Nginx com Proxy Reverso para o backend
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
