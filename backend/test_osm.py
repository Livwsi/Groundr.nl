import asyncio
import aiohttp

async def test():
    # Simple query: find train stations near Eindhoven centre
    query = """
    [out:json][timeout:10];
    (
      node["railway"="station"](around:2000,51.4416,5.4697);
    );
    out center;
    """

    url = "https://overpass-api.de/api/interpreter"

    async with aiohttp.ClientSession() as session:
        async with session.get(url, params={"data": query}) as r:
            print("Status:", r.status)
            print("Content-Type:", r.content_type)
            data = await r.json(content_type=None)
            elements = data.get("elements", [])
            print(f"Found {len(elements)} elements")
            for e in elements[:3]:
                print(" -", e.get("tags", {}).get("name", "unnamed"))

asyncio.run(test())