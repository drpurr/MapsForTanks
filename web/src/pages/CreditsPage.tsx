import { useEffect } from 'react'

export function CreditsPage() {
  useEffect(() => { document.title = 'Credits – Tank Maps' }, [])
  return (
    <main className="credits">
      <h1>Credits</h1>
      <section>
        <h2>Routes</h2>
        <p>
          The tank routes are adapted from the <a href="https://mapsfortanks.wordpress.com/" target="_blank" rel="noreferrer">MapsForTanks</a> guides,
          traced from their original drawings and redrawn on the game's maps.
        </p>
      </section>
      <section>
        <h2>Maps</h2>
        <p>Most dungeon and raid maps are the World of Warcraft client's own world-map art. Map art © Blizzard Entertainment.</p>
        <p>
          Maps for instances that only exist in WoW Forever are by Santiago Reyes, from{' '}
          <a href="https://www.artstation.com/artwork/lEG15k" target="_blank" rel="noreferrer">Atlas of Azeroth: Forever</a>,
          used with the artist's permission: Alcaz Prison, Blackmaw Hold, City of Dalaran, Excavation Site: Wetlands,
          Krol'dok Stronghold, Ruins of Lordaeron, The Drowned City and The Hall of Thanes.
        </p>
      </section>
      <section>
        <h2>Videos</h2>
        <p>Linked YouTube videos belong to their creators and open on YouTube.</p>
      </section>
      <p className="muted">Tank Maps isn't affiliated with Blizzard Entertainment.</p>
    </main>
  )
}
