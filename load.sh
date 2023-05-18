clientAppId=$1
count=$2

start=$(date +%s)
for i in $(seq $count); do
   npm start  -- clientAppId=${clientAppId} multipleClientTest &
done

wait
end=$(date +%s)

echo "Elapsed Time: $(($end-$start)) seconds"
