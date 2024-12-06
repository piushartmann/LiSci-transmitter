find ./public -type f -name '*.js' -exec sh -c '
  for file; do
    base_path="${file#./public/}"
    relative_path="${base_path#*/}"
    foldername="${base_path%/*}"
    output="${file%.js}.min.js"
    map_url="${relative_path%.js}.min.js.map"
    echo "Minifying $relative_path"
    terser "$file" -o "$output" --compress --mangle --source-map "base=\"./public/$foldername\",filename=\"$map_url\",url=\"$map_url\""
  done
' sh {} +

echo "Minification complete"

node ".\translate_language_file.js"