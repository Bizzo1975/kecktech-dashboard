from pathlib import Path

p = Path("/opt/docker/traefik/traefik.yml")
text = p.read_text()
if 'address: ":8883"' in text:
    print("mqtt entrypoints already present")
else:
    needle = '  websecure:\n    address: ":443"\n'
    if needle not in text:
        raise SystemExit("websecure block not found")
    insert = (
        needle
        + '  mqtt:\n'
        + '    address: ":8883"\n'
        + '  mqttws:\n'
        + '    address: ":3002"\n'
    )
    p.write_text(text.replace(needle, insert, 1))
    print("added mqtt entrypoints")
print("---")
print(text[:400] if 'address: ":8883"' in Path("/opt/docker/traefik/traefik.yml").read_text() else Path("/opt/docker/traefik/traefik.yml").read_text().split("providers:")[0])
