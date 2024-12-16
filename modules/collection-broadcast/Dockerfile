# Use official Node.js runtime as the base image
FROM node:20-bookworm

# Install FFmpeg
RUN apt-get update && apt-get install -y ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Both package.json AND package-lock.json are copied
COPY package.json yarn.lock* ./

# Install app dependencies
RUN \
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Bundle app source
COPY . .

# Copy the .env and .env.prod files
# COPY .env ./

# Expose the port that the app will run on
EXPOSE 3000

# Command to start the app
# CMD ["yarn", "start"]
CMD ["node", "main.js"]
