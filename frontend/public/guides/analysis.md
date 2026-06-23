# Analysis Pipeline
This tool processes raw Next-Generation Sequencing (NGS) reads from eDNA projects and separate them into projects, sampling sites, and species.

**Inputs:**

*   **Paired-end reads:** FASTQ format. Files must be named with "R1" and "R2" (e.g., `eDNA_R1.fastq`, `eDNA_R2.fastq`).

*   **Tags File:** A comma-separated file (CSV) containing 6 columns **without** titles: Project ID, Location ID, Forward Barcode, Forward Primer, Reverse Barcode, Reverse Primer (e.g., `tags.csv`).

*   **Reference Sequence:** A FASTA format file from NCBI with species names in the defline (e.g., `NCBI_ref.fa`). This is to be uploaded at the workflow page.

**Outputs:**
The pipeline produces summary and species-level files upon completion. Compressed files are provided for convenient download.

**General Summary:** Summary for all species
*   **Location vs. Species Table:** A comma-separated (CSV) file summarizing ASV counts for each location against identified species, found at the top of the results page.

**Individual Species Files:** For each identified species, the pipeline generates three files:
*   **Location vs. ASV Table:** A comma-separated (CSV) file detailing ASV counts per location for that specific species.
*   **Multiple Sequence Alignment (MSA):** A FASTA file containing aligned sequences.
    *   *Defline Format:* `>ProjectID_ReadIndex_LocationID,ASV_Index_Count`
    *   *Example:* `>R1f_139_ZpDL_YTR,ASV_0_5` (separated by comma and then by underscore)
    *   *Key:* 
    *   *   **R1f:** Read pair orientation
        *   **139:** Read index number from the raw FASTQ file
        *   **ZpDL:** Project ID
        *   **YTR:** Location ID
        *   **ASV:** Indicate ASV information
        *   **0:** ASV index 0
        *   **5:** There are 5 identical reads of this ASV
*   **Rare or Low-Occurrence Reads:** A file containing reads excluded from the final analysis due to low occurrence frequency.

**Configuration:**
*   **Project Selection:** Run one project at a time.
*   **Merged-read lengths:** Enter minimum and maximum lengths.
*   **Identity %:** Default is 98% for species assignment.
*   **Min Copies:** Default is 3 to determine an ASV.

PEAR: https://doi.org/10.1093/bioinformatics/btt593

BLAST: https://blast.ncbi.nlm.nih.gov/Blast.cgi

MAFFT: https://doi.org/10.1093/nar/gkt389
