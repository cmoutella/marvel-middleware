import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { crypto, toHashString } from "https://deno.land/std@0.192.0/crypto/mod.ts";


// Public Keys
const MARVEL_PUBLIC_KEY: string = "2691643914b2e2abf77b6b5b7de5b867";

// Request Types
type ManyHerosProps = {
  searchTerm: string;
};

type OneHeroProps = {
  heroId: string;
};

// Response Types
type Thumbnail = {
  path: string;
  extension: string;
};

type CharacterAppearances = {
  available: number;
  collectionURI: string;
  items: [];
  returned: number;
};

type MoreInfoUrl = {
  type: string;
  url: string;
};

type CharactersUrls = MoreInfoUrl[];

export type Hero = {
  id: number;
  name: string;
  description: string;
  modified: string;
  thumbnail: Thumbnail;
  resourceURI: string;
  comics: CharacterAppearances;
  series: CharacterAppearances;
  stories: CharacterAppearances;
  events: CharacterAppearances;
  urls: CharactersUrls;
};

// Hash handler
type Hash_Generator = (string) => Promise<string>;

const generateHash: Hash_Generator = async (ts) => {
  const toHash = `${ts}${MARVEL_PUBLIC_KEY}${Deno.env.get("MARVEL_PVT_KEY")}`;

  const finalHash: string = await crypto.subtle.digest(
    "MD5",
    new TextEncoder().encode(toHash)
  );

  return toHashString(finalHash);
};

// Requests
const getOneHero = async (heroId: OneHeroProps) => {
  const ts: string = Math.floor(new Date().getTime() / 1000).toString();

  const endpoint = new URL(
    `characters/${heroId}?ts=${ts}&apikey=${MARVEL_PUBLIC_KEY}&hash=${generateHash(ts)}`,
    "https://gateway.marvel.com/v1/public/"
  );

  await fetch(endpoint)
    .then((_res) => _res.json())
    .then((res) => {
      console.log('res', res)
      const heroData: Hero = res.data?.results;
      return heroData;
    }).catch((_err) => {
      console.log('getOneHero', _err)
      return { error: _err }
    });
};

const getManyHeros = async (  searchParams
: ManyHerosProps) => {
  const ts = Math.floor(new Date().getTime() / 1000).toString();

  const endpoint = new URL(
    `characters${searchParams}&limit=100&ts=${ts}&apikey=${MARVEL_PUBLIC_KEY}&hash=${generateHash(ts)}`,
    "http://gateway.marvel.com/v1/public/"
  );

  await fetch(endpoint)
    .then((_res) => _res.json())
    .then((res) => {
      console.log('res', res)
      const manyHeros: Hero[] = res.data?.results;
      return manyHeros;
    }).catch((_err) => {
      console.log('getManyHeros', _err)
      return { error: _err }
    });
};

const router = new Router();
router
  .get("/", async (context) => {
    context.response.body = "I'm working, let's fetch some heros!";
  })
  .get("/api/hash", async (context) => {
    const urlData = new URL(context.request.url)
    const searchParams = new URLSearchParams(urlData.search)

    if (searchParams.has('ts')) {
      const ts = searchParams.get('ts')
      const hash = await generateHash(ts)

      const data = {
        hash: hash,
        ts: ts,
        pubKey: MARVEL_PUBLIC_KEY
      }

      context.response.body = {
        data: data, 
        message: 'SUCCESS'
      }
    } else {
      context.response.body = JSON.stringify({
        data: null,
        message: 'ERROR: Missing timestamp'
      })
    }
  })
  .get("/api/heros", async (context) => {
    const searchParams = context.request.url.search
    console.log('#################')
    console.log('MANY HEROS')
    const manyHeros = await getManyHeros(searchParams);
    console.log('manyHeros', manyHeros)
    context.response.body = manyHeros
  })
  .get("/api/hero/:heroId", async (context) => {
    const heroId = context.params.heroId
    console.log('#################')
    console.log('ONE HERO')
    const oneHero = await getOneHero(heroId);
    console.log('oneHero', oneHero)
    context.response.body = oneHero
  });

const app = new Application();
app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
