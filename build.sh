find ./public -type f -name '*.js' -exec sh -c 'terser \"$1\" -o \"$1\" --compress --mangle --source-map \"base=./public,filename=$1.map,url=${1#./public}.map\"' _ {} \\;
