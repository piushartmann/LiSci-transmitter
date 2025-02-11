echo "Minifying images..."

find . -type f -path '*/public/*.js' -exec sh -c '
  for file; do
    base_path="${file#./}"
    relative_path="${base_path#*/}"
    foldername="$(dirname "$base_path")"
    output="${file%.js}.min.js"
    map_url="/${relative_path%.js}.min.js.map"
    echo "Minifying $relative_path"
    terser "$file" -o "$output" --compress --mangle --source-map "base=\"$foldername\",filename=\"$map_url\",url=\"$map_url\""
  done
' sh {} +

echo "Translating language files..."

node "translate_language_file.js"