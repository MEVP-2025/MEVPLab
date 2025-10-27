#!/usr/bin/env python3

import subprocess
import os
from pathlib import Path

class MAFFTTools:
    """MAFFT Tool Wrapper"""
    
    def __init__(self):
        # -- check if running in Docker environment
        self.in_docker = os.path.exists("/app") and os.path.exists("/.dockerenv")
    
    def run_command(self, cmd, cwd=None, capture_output=True):
        try:
            print(f"Executing: {' '.join(cmd)}", flush=True)
            
            result = subprocess.run(
                cmd,
                cwd=cwd,
                capture_output=capture_output,
                text=True,
                check=True
            )
            
            return result
            
        except subprocess.CalledProcessError as e:
            print(f"Command failed: {' '.join(cmd)}", flush=True)
            print(f"Error: {e.stderr}", flush=True)
            raise
    
    def mafft_align(self, input_file, output_file, threads=4):
        """
        Perform multiple sequence alignment using MAFFT
        
        Args:
            input_file: Input FASTA file path
            output_file: Output aligned FASTA file path
            threads: Number of threads to use
        """
        if not self.in_docker:
            print("MAFFT can only be executed within Docker container", flush=True)
        
        if not Path(input_file).exists():
            raise FileNotFoundError(f"Input file not found: {input_file}")
        
        output_path = Path(output_file)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # -- MAFFT command
        cmd = [
            'mafft',
            '--auto',           # Auto-select alignment strategy
            '--thread', str(threads),
            str(input_file)
        ]
        
        # -- Run MAFFT and redirect output to file
        try:
            print(f"Running MAFFT alignment: {input_file} -> {output_file}", flush=True)
            
            with open(output_file, 'w') as output_handle:
                result = subprocess.run(
                    cmd,
                    stdout=output_handle,
                    stderr=subprocess.PIPE,
                    text=True,
                    check=True
                )
            
            print(f"MAFFT completed successfully", flush=True)
            if result.stderr:
                print(f"MAFFT stderr: {result.stderr}", flush=True)
                
        except subprocess.CalledProcessError as e:
            print(f"MAFFT failed: {e.stderr}", flush=True)
            raise
        
        return output_file

def count_sequences(fasta_file):
    """Count sequences in a FASTA file"""
    if not Path(fasta_file).exists():
        return 0
    
    count = 0
    with open(fasta_file, 'r') as f:
        for line in f:
            if line.startswith('>'):
                count += 1
    return count

def get_file_size(file_path):
    """Get file size in human readable format"""
    if not Path(file_path).exists():
        return "0 bytes"
    
    size = Path(file_path).stat().st_size
    if size < 1024:
        return f"{size} bytes"
    elif size < 1024**2:
        return f"{size/1024:.1f} KB"
    elif size < 1024**3:
        return f"{size/(1024**2):.1f} MB"
    else:
        return f"{size/(1024**3):.1f} GB"

def MAFFT():
    tools = MAFFTTools()
    
    print("=" * 50, flush=True)
    print("""
    ---------------------------------------------------------------------

    MAFFT v7.505 (2022/Apr/10)

            MBE 30:772-780 (2013), NAR 30:3059-3066 (2002)
            https://mafft.cbrc.jp/alignment/software/
    ---------------------------------------------------------------------
    """, flush=True)
    print(flush=True)
    
    classifier_output_dir = "/app/data/outputs/classifier"
    mafft_output_dir = "/app/data/outputs/mafft"
    
    os.makedirs(mafft_output_dir, exist_ok=True)
    
    # Find all .classifier.species files
    species_files = []
    
    # Look for classifier.species files (assuming they contain haplotype sequences)
    for fasta_file in Path(classifier_output_dir).glob("*.fasta"):
        species_name = fasta_file.stem
        
        if fasta_file.exists() and fasta_file.stat().st_size > 0:
            species_files.append({
                'species': species_name,
                'hap_file': str(fasta_file)
            })
    
    if not species_files:
        print("No FASTA files found in classifier_output directory", flush=True)
        print("Please check if you have:", flush=True)
        print("  - *.fasta files", flush=True)
        return
    
    print(f"Found {len(species_files)} species files for alignment", flush=True)
    
    # Display found files
    for species_data in species_files:
        species = species_data['species']
        hap_file = species_data['hap_file']
        seq_count = count_sequences(hap_file)
        file_size = get_file_size(hap_file)
        
        print(f"Species: {species}", flush=True)
        print(f"  Input: {Path(hap_file).name} ({seq_count} sequences, {file_size})", flush=True)
    
    print(f"\nStarting MAFFT alignment for {len(species_files)} species...", flush=True)
    
    # Process each species
    results = {}
    for species_data in species_files:
        species = species_data['species']
        input_file = species_data['hap_file']
        output_file = f"{mafft_output_dir}/{species}.msa.fa"
        
        print(f"\nProcessing species: {species}", flush=True)
        
        # -- if input has enough sequences for alignment
        seq_count = count_sequences(input_file)
        if seq_count < 2:
            print(f"  Skipping {species}: only {seq_count} sequence(s) found (need at least 2)", flush=True)
            continue
        
        try:
            # Run MAFFT alignment
            result_file = tools.mafft_align(
                input_file=input_file,
                output_file=output_file
            )
            
            # Check results
            if Path(result_file).exists():
                output_seq_count = count_sequences(result_file)
                output_size = get_file_size(result_file)
                
                print(f"  ✓ {species} alignment completed", flush=True)
                print(f"    Output: {Path(result_file).name} ({output_seq_count} sequences, {output_size})", flush=True)
                
                results[species] = {
                    'input_file': input_file,
                    'output_file': result_file,
                    'input_sequences': seq_count,
                    'output_sequences': output_seq_count
                }
            else:
                print(f"  ✗ {species} alignment failed: output file not created", flush=True)
                
        except Exception as e:
            print(f"  ✗ {species} alignment failed: {e}", flush=True)
            continue
    
    print(f"\nMAFFT alignment completed!", flush=True)
    print(f"Successfully aligned {len(results)} species", flush=True)
    
    if results:
        print("\nSummary:", flush=True)
        for species, data in results.items():
            print(f"  {species}: {data['input_sequences']} → {data['output_sequences']} sequences", flush=True)
    
    return results

def list_available_files():
    print("Checking directory structure...", flush=True)
    
    # Check classifier output directory
    classifier_dir = "/app/data/outputs/classifier"
    if os.path.exists(classifier_dir):
        print(f"\nClassifier output directory: {classifier_dir}", flush=True)
        files = list(Path(classifier_dir).glob("*"))
        if files:
            for file in sorted(files):
                size = get_file_size(file)
                seq_count = count_sequences(file) if file.suffix in ['.fa', '.fasta', '.species'] else 0
                seq_info = f" ({seq_count} sequences)" if seq_count > 0 else ""
                print(f"  {file.name} ({size}){seq_info}", flush=True)
        else:
            print("  (empty directory)", flush=True)
    else:
        print(f"classifier output directory does not exist: {classifier_dir}", flush=True)
    
    # Check MAFFT output directory
    mafft_dir = "/app/data/outputs/mafft"
    if os.path.exists(mafft_dir):
        print(f"\nMAFFT output directory: {mafft_dir}", flush=True)
        files = list(Path(mafft_dir).glob("*"))
        if files:
            for file in sorted(files):
                size = get_file_size(file)
                seq_count = count_sequences(file) if file.suffix in ['.fa', '.fasta'] else 0
                seq_info = f" ({seq_count} sequences)" if seq_count > 0 else ""
                print(f"  {file.name} ({size}){seq_info}", flush=True)
        else:
            print("  (empty directory)", flush=True)
    else:
        print(f"MAFFT output directory: {mafft_dir} (will be created)", flush=True)

if __name__ == "__main__":
    list_available_files()
    print(flush=True)
    
    MAFFT()