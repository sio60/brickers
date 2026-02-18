#!/bin/sh
# envsubst: ${AI_SERVER_URL}만 치환 (nginx 자체 변수 $host, $remote_addr 등은 보존)
envsubst '${AI_SERVER_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

exec /usr/bin/supervisord -c /etc/supervisord.conf
