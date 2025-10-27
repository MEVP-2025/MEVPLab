#!/usr/bin/env python3

import os
import sys
from pathlib import Path
from collections import defaultdict

def parse_assign_species(assign_file):
    """
    Parse assign.species file, return a mapping of sequence names to species
    
    File format:
    f_3_CypDL_XkB_R1f,Opsariichthys_pachycephalus,98.605,f_3_CypDL_XkB_R1f,MG650171.1:1568816612_Opsariichthys_pachycephalus_mitochondrion_complete_genome,98.605,215,3,0,1,215,77,291,3.71e-108,381
    
    Returns:
    - seq_to_species: { Sequence name : Species name }
    - species_count: { Species name : Total count }
    """
    seq_to_species = {}
    species_count = defaultdict(int)  # Initialize dictionary with default value 0
    
    with open(assign_file, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.rstrip()
            if line:
                parts = line.split(',')  # ['f_3_CypDL_XkB_R1f', 'Opsariichthys_pachycephalus', '98.605', 'f_3_CypDL_XkB_R1f', ...]
                if len(parts) >= 2:
                    seq_name = parts[0]  # sequence name
                    species = parts[1]   # species name
                    seq_to_species[seq_name] = species
                    species_count[species] += 1
                else:
                    print(f"Warning: Line {line_num} has incorrect format: {line}", flush=True)
    
    return seq_to_species, species_count

def read_fasta_sequences(fasta_file):
    """
    Parse a FASTA file, return a dictionary of sequences.
    
    Returns: { sequence name: (full header, sequence) }
    """
    sequences = {}
    
    with open(fasta_file, 'r', encoding='utf-8') as f:
        while True:
            header = f.readline().rstrip()
            if not header:
                break
            sequence = f.readline().rstrip()
            
            if header.startswith('>'):
                seq_name = header.split()[0][1:]
                sequences[seq_name] = (header, sequence)
                # Example: { f_0_CypDL_NNWra_R1f: ('>f_0_CypDL_NNWra_R1f', 'ACCCATTATT...') }
    
    return sequences

def classify_sequences_by_species(seq_to_species, sequences):
    """
    Classify sequences by species
    
    Parameters:
    - seq_to_species: {sequence name: species name} e.g., {f_132_ZpDL_CHR_R2f: Opsariichthys_pachycephalus}
    - sequences: {sequence name: (header, sequence)}
    
    Returns:
    - species_sequences: {species name: [(header, sequence), ...]}
    - found_sequences: number of successfully matched sequences
    - missing_sequences: list of sequences not found in FASTA file
    """
    species_sequences = defaultdict(list)
    found_sequences = 0  # counter
    missing_sequences = []
    
    for seq_name, species in seq_to_species.items():
        if seq_name in sequences:
            header, seq = sequences[seq_name]  # header = ">f_0_CypDL_NNWra_R1f"
            species_sequences[species].append((header, seq))
            found_sequences += 1
        else:
            missing_sequences.append(seq_name)
    
    return species_sequences, found_sequences, missing_sequences

def write_species_fasta(species_sequences, prefix):
    """
    Write FASTA files for each species
    
    Parameters:
    - species_sequences: {species name: [(header, sequence), ...]}
    - prefix: file prefix for output files
    """
    output_files = []
    output_dir = Path("/app/data/outputs/classifier")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    for species, seqs in species_sequences.items():
        # species = "Opsariichthys_pachycephalus" 
        # seqs = [('>f_132_ZpDL_CHR_R2f', 'ACATAT...'), ('>f_148_ZpDL_KKK2_R1f', 'ACATAT...'), ...]
        clean_species = species.replace(' ', '_').replace('/', '_').replace('\\', '_')
        output_file = output_dir / f"{prefix}_{clean_species}.fasta"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            for header, seq in seqs:
                # header = ">f_132_ZpDL_CHR_R2f"
                f.write(f"{header}\n")
                f.write(f"{seq}\n")
        
        output_files.append(str(output_file))
        print(f"Species {species}: {len(seqs)} sequences -> {output_file}", flush=True)
    
    return output_files

if __name__ == "__main__":
    assign_path = Path("/app/data/outputs/assign")
    assign_f = list(assign_path.glob("*.assign.species"))
    assign_file = str(assign_f[0])

    fasta_path = Path("/app/data/outputs/filter")
    fasta_f = list(fasta_path.glob("*.assembled.len.fasta"))
    fasta_file = str(fasta_f[0])
    
    prefix = Path(assign_file).name.split(".")[0]
    
    print(f"Species Classifier...", flush=True)
    print(f"Processing files:", flush=True)
    print(f"  - assign.species: {assign_file}", flush=True)
    print(f"  - fasta: {fasta_file}", flush=True)
    print("=" * 50, flush=True)
    
    seq_to_species, species_count = parse_assign_species(assign_file)
    
    print(f"Found {len(seq_to_species)} sequence assignments", flush=True)
    print("Species statistics:", flush=True)
    for species, count in sorted(species_count.items()):
        print(f"  - {species}: {count} sequences", flush=True)
    print(flush=True)
    
    sequences = read_fasta_sequences(fasta_file)
    
    species_sequences, found_sequences, missing_sequences = classify_sequences_by_species(
        seq_to_species, sequences
    )

    if missing_sequences:
        print(f"Warning: {len(missing_sequences)} sequences not found in FASTA file:", flush=True)
        for seq in missing_sequences[:10]:  # Show only first 10
            print(f"  - {seq}", flush=True)
        if len(missing_sequences) > 10:
            print(f"  ... and {len(missing_sequences) - 10} more", flush=True)
    print(flush=True)
    
    output_files = write_species_fasta(species_sequences, prefix)
    
    print(flush=True)
    print("Completed! Generated files:", flush=True)
    for file in output_files:
        if os.path.exists(file):
            size = os.path.getsize(file)
            print(f"  - {file} ({size} bytes)", flush=True)