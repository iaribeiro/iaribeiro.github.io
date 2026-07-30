# 🛣️ EN16 — Estrada da Paz

Site estático (HTML/CSS/JS puro, sem build) com um guia de cicloturismo da **EN16**, entre o Porto de Aveiro (Km 0) e a fronteira de Vilar Formoso (Km 224): as 5 etapas, pontos de interesse, restaurantes típicos, dormidas, mapa interativo e ficha técnica da rota.

> Conteúdo baseado no documento `estrada_da_paz.docx` fornecido, com fontes citadas no roteiro original: pt.wikipedia.org, escapelivre.com, turismodocentro.pt, andardecoiso.pt, rotasnacionais.pt.

## 📁 Estrutura do projeto

```
estrada-da-paz/
├── index.html          # página única do site
├── css/
│   └── style.css       # identidade visual (sinalética rodoviária)
├── js/
│   ├── data.js         # dados da rota embutidos (para funcionar sem servidor)
│   └── main.js         # gera as etapas, o mapa e a lista de locais
├── data/
│   └── pois.json        # a mesma informação em JSON puro (fonte de dados)
└── README.md
```

Não há dependências de build (npm, webpack, etc.) — é HTML/CSS/JS servido diretamente. O mapa usa [Leaflet](https://leafletjs.com/) carregado via CDN.

## 🖥️ Testar localmente

Basta abrir `index.html` num browser, ou correr um servidor simples:

```bash
cd estrada-da-paz
python3 -m http.server 8000
# abrir http://localhost:8000
```

## 🚀 Publicar no GitHub (passo a passo)

### 1. Criar o repositório no GitHub
No site do GitHub: **New repository** → nome sugerido `estrada-da-paz` → **Create repository** (não adicionar README/licença automáticos, para evitar conflitos).

Ou, se tiveres o [GitHub CLI](https://cli.github.com/) instalado:
```bash
gh repo create estrada-da-paz --public --source=. --remote=origin
```

### 2. Inicializar o git localmente e publicar
A partir da pasta `estrada-da-paz`:

```bash
cd estrada-da-paz
git init
git add .
git commit -m "Site inicial: rota EN16 — Estrada da Paz"
git branch -M main
git remote add origin https://github.com/<o-teu-utilizador>/estrada-da-paz.git
git push -u origin main
```

### 3. Ativar o GitHub Pages
No repositório, em **Settings → Pages**:
- **Source**: `Deploy from a branch`
- **Branch**: `main` / pasta `/ (root)`
- Guardar. Ao fim de 1–2 minutos o site fica disponível em:

```
https://<o-teu-utilizador>.github.io/estrada-da-paz/
```

## ✏️ Atualizar o conteúdo

Todos os dados da rota (etapas, distâncias, coordenadas, restaurantes, dormidas, locais imperdíveis) estão centralizados em **`js/data.js`** (e replicados em `data/pois.json` como referência legível). Para editar:

1. Altera `data/pois.json`.
2. Regenera `js/data.js` com o mesmo conteúdo, atribuído à variável `EN16_DATA` (ou copia manualmente — o formato é idêntico, só muda `const EN16_DATA = { ... };`).
3. Faz commit e push — o GitHub Pages atualiza automaticamente.

## 🎨 Identidade visual

- **Cores**: asfalto (#1C1B19), pedra do marco quilométrico (#F1EAD9), verde de sinalização de estrada nacional (#2B4F3E), vinho do Dão (#7A2E2E), granito da Beira (#8C8577), ouro/trigo (#B8862B).
- **Tipografia**: Oswald (títulos, condensada, como sinalética rodoviária), Source Serif 4 (texto corrido) e IBM Plex Mono (coordenadas e distâncias, como um odómetro/GPS).
- **Elemento de assinatura**: o marco quilométrico de granito ilustrado no logótipo e a "calha" vertical de progressão (0–224 km) ao lado das etapas.

## 📄 Licença

Usa livremente este projeto como base para o teu site — ajusta a licença conforme preferires antes de publicar.
