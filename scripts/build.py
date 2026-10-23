from pathlib import Path
root=Path(__file__).resolve().parents[1]
s=(root/'src/index.template.html').read_text()
for token,name in [('CSS','style.css'),('DATA','map-data.js'),('CORE','core.js'),('APP','app.js')]:
 content=(root/'src'/name).read_text()
 if name.endswith('.js'):content=content.replace('</script','<\\/script')
 s=s.replace('/*__'+token+'__*/',content)
(root/'dist').mkdir(exist_ok=True)
(root/'dist/index.html').write_text(s)
(root/'index.html').write_text(s)
print('Built standalone HTML:',(root/'dist/index.html').stat().st_size,'bytes')
