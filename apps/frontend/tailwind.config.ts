import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./lib/**/*.{ts,tsx}'], theme: { extend: { colors: { background:'#ffffff', card:'#7CD8B3', ink:'#0b0b0b', graphite:'#000000', mint:'#7CD8B3', aqua:'#7CD8B3', danger:'#b91c1c' }, boxShadow: { panel:'0 10px 30px rgba(0,0,0,.08)', premium:'0 18px 40px rgba(0,0,0,.12)' } } }, plugins: [] };
export default config;
