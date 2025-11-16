self.onmessage = (event) => {
  const { type, fileContent } = event.data;

  if (type === "parseFile") {
    if (typeof fileContent !== "string") {
      console.error("❌ fileContent 不是字串，實際為:", typeof fileContent);
      return;
    }

    const geneNames = [];
    const sequences = {};

    let currentGene = null;
    const lines = fileContent.split("\n");

    lines.forEach((line) => {
      if (line.startsWith(">")) {
        currentGene = line.substring(1).trim();
        geneNames.push(currentGene);
        sequences[currentGene] = "";
      } else if (currentGene) {
        sequences[currentGene] += line.trim();
      }
    });

    self.postMessage({ geneNames, sequences });
  }
};



  
