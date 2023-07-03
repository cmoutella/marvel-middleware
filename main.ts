import { Application, Router } from "https://deno.land/x/oak@v11.1.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import { crypto, toHashString } from "https://deno.land/std@0.192.0/crypto/mod.ts";


// Public Keys
const MARVEL_PUBLIC_KEY: string = "2691643914b2e2abf77b6b5b7de5b867";

// Request Types

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
  const toHash = `${ts}${Deno.env.get("MARVEL_PVT_KEY")}${MARVEL_PUBLIC_KEY}`;

  const finalHash: string = await crypto.subtle.digest(
    "MD5",
    new TextEncoder().encode(toHash)
  );

  return toHashString(finalHash);
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

      context.response.body = JSON.stringify(data)
    } else {
      context.response.body = JSON.stringify({
        data: null,
        message: 'ERROR: Missing timestamp'
      })
    }
  })
  .get("/api/heros", async (context) => {
    const searchParams = context.request.url.search
    let manyHeros: Hero[] = []

    const ts = Math.floor(new Date().getTime() / 1000).toString();

    const endpoint = new URL(
      `characters${searchParams}`,
      "http://gateway.marvel.com/v1/public/"
    );

    endpoint.searchParams.append('limit', '50')
    endpoint.searchParams.append('ts', ts)
    endpoint.searchParams.append('apikey', MARVEL_PUBLIC_KEY)
    endpoint.searchParams.append('hash', await generateHash(ts))
  
    await fetch(endpoint.href)
      .then((_res) => _res.json())
      .then((res) => {
        manyHeros = res.data?.results;
      }).catch((_err) => {
        context.response.body = { message: _err }
      });

    context.response.body = JSON.stringify(manyHeros)
  })
  .get("/api/hero/:heroId", async (context) => {
    const heroId = context.params.heroId
    let oneHero: Hero | null = null
    const ts: string = Math.floor(new Date().getTime() / 1000).toString();
    
    const endpoint = new URL(
      `characters/${heroId}`,
      "http://gateway.marvel.com/v1/public/"
      );

      endpoint.searchParams.append('ts', ts)
      endpoint.searchParams.append('apikey', MARVEL_PUBLIC_KEY)
      endpoint.searchParams.append('hash', await generateHash(ts))

    await fetch(endpoint.href)
      .then((_res) => _res.json())
      .then((res) => {
        oneHero = res.data.results[0];
      }).catch((_err) => {
        context.response.body = { message: _err }
      });

      context.response.body = JSON.stringify(oneHero)
  });

const app = new Application();
app.use(oakCors()); // Enable CORS for All Routes
app.use(router.routes());
app.use(router.allowedMethods());

await app.listen({ port: 8000 });
