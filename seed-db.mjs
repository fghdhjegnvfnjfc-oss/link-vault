import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is not set");
  process.exit(1);
}

async function seed() {
  try {
    const db = drizzle(DATABASE_URL);

    console.log("Seeding database...");

    // Create sample folders
    const sampleFolders = [
      {
        name: "Productivity",
        icon: "⚡",
        color: "oklch(0.75 0.18 85)",
        displayOrder: 0,
      },
      {
        name: "Development",
        icon: "🛠",
        color: "oklch(0.65 0.18 200)",
        displayOrder: 1,
      },
      {
        name: "Design",
        icon: "🎨",
        color: "oklch(0.68 0.20 320)",
        displayOrder: 2,
      },
      {
        name: "Learning",
        icon: "📚",
        color: "oklch(0.70 0.18 145)",
        displayOrder: 3,
      },
    ];

    // Use raw connection to insert data
    const connection = await mysql.createConnection(DATABASE_URL);

    // Check if folders already exist
    const [existingFolders] = await connection.query("SELECT COUNT(*) as count FROM folders");
    if (existingFolders[0].count > 0) {
      console.log("✓ Database already seeded");
      await connection.end();
      process.exit(0);
    }

    // Insert folders
    for (const folder of sampleFolders) {
      await connection.query(
        "INSERT INTO folders (name, icon, color, displayOrder) VALUES (?, ?, ?, ?)",
        [folder.name, folder.icon, folder.color, folder.displayOrder]
      );
    }
    console.log(`✓ Created ${sampleFolders.length} folders`);

    // Get folder IDs
    const [folders] = await connection.query("SELECT id FROM folders ORDER BY displayOrder");

    // Create sample links
    const sampleLinks = [
      {
        folderId: folders[0].id,
        title: "Notion",
        url: "https://notion.so",
        description: "All-in-one workspace for notes and projects",
        displayOrder: 0,
      },
      {
        folderId: folders[0].id,
        title: "Todoist",
        url: "https://todoist.com",
        description: "Task manager and to-do list app",
        displayOrder: 1,
      },
      {
        folderId: folders[1].id,
        title: "GitHub",
        url: "https://github.com",
        description: "Code hosting and version control platform",
        displayOrder: 0,
      },
      {
        folderId: folders[1].id,
        title: "Vercel",
        url: "https://vercel.com",
        description: "Deploy and host frontend applications",
        displayOrder: 1,
      },
      {
        folderId: folders[2].id,
        title: "Figma",
        url: "https://figma.com",
        description: "Collaborative interface design tool",
        displayOrder: 0,
      },
      {
        folderId: folders[3].id,
        title: "MDN Web Docs",
        url: "https://developer.mozilla.org",
        description: "Comprehensive web development documentation",
        displayOrder: 0,
      },
    ];

    // Insert links
    for (const link of sampleLinks) {
      await connection.query(
        "INSERT INTO links (folderId, title, url, description, displayOrder) VALUES (?, ?, ?, ?, ?)",
        [link.folderId, link.title, link.url, link.description, link.displayOrder]
      );
    }
    console.log(`✓ Created ${sampleLinks.length} links`);

    await connection.end();
    console.log("\n✅ Database seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seed();
