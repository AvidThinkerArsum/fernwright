import { Brief } from "@/components/Brief";
import { Costs } from "@/components/Costs";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/hero/Hero";
import { MobileBar, Nav } from "@/components/Nav";
import { Process } from "@/components/Process";
import { Stories } from "@/components/Stories";
import { Trust } from "@/components/Trust";
import { Work } from "@/components/Work";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Costs />
        <Stories />
        <Work />
        <Trust />
        <Process />
        <Brief />
      </main>
      <Footer />
      <MobileBar />
    </>
  );
}
