from node
workdir /app

# ffprobe validates uploaded videos (content, codec, duration)
run apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*

copy . .
run npm install

expose 11000
cmd ["npm", "start"]