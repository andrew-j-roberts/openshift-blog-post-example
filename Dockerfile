FROM node:12-alpine

LABEL maintainer="Andrew.Roberts@solace.com"

# create directories
RUN mkdir -p /usr/app 

# copy source code
COPY package*.json /usr/app/
COPY dist/ /usr/app/

# set container's base dir
WORKDIR /usr/app

# install dependencies, build app, and then remove dev packages and unused source files
RUN npm install --production

# start the app
EXPOSE 3001
CMD [ "npm", "run", "start"]