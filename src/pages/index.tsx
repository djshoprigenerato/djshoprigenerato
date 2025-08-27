import type { NextPage } from "next";
import Link from "next/link";

const Home: NextPage = () => (
  <>
    <div className="bg-primary text-white py-20 text-center">
      <h1 className="text-5xl font-bold">DJ Shop Rigenerato</h1>
      <p className="mt-4 text-xl">La musica incontra la sostenibilità</p>
      <Link href="/shop">
        <a className="mt-8 inline-block bg-secondary text-white px-6 py-3 rounded text-lg">
          Scopri il Shop
        </a>
      </Link>
    </div>
  </>
);

export default Home;
