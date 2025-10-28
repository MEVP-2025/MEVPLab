#!/usr/bin/env python3

import subprocess
import os
# import logging
import sys
from pathlib import Path

class BLASTTools:
    """BLAST Tool Wrapper"""
    
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
    
    def makeblastdb(self, input_fasta, dbtype='nucl'):
        if not self.in_docker:
            print("BLAST can only be executed within Docker container", flush=True)
            print(f"docker run -it your-image python3 script.py", flush=True)
        
        cmd = [
            'makeblastdb',
            '-in', str(input_fasta),
            '-dbtype', dbtype
        ]
        
        self.run_command(cmd)
        
        return input_fasta
    
    def blastn(self, query_file, database, output_file, outfmt=10, num_alignments=10, num_threads=4):
        """
        Args:
            query_file: Query sequence file
            database: BLAST database path
            output_file: Output file path
            outfmt: Output format (default 10 for CSV format)
            num_alignments: Maximum number of alignments per query sequence
            num_threads: Number of threads
        """
        if not self.in_docker:
            print("BLAST can only be executed within Docker container", flush=True)
            print(f"docker run -it your-image python3 script.py", flush=True)
        
        cmd = [
            'blastn',
            '-query', str(query_file),
            '-db', str(database),
            '-out', str(output_file),
            '-outfmt', str(outfmt),
            '-num_alignments', str(num_alignments),
            '-num_threads', str(num_threads)
        ]
        
        self.run_command(cmd)
        
        return output_file
    
    def count_sequences_in_fasta(self, fasta_file):
        """Count NCBI sequence amount"""
        try:
            count = 0
            with open(fasta_file, 'r') as f:
                for line in f:
                    if line.startswith('>'):
                        count += 1
            return count
        except Exception as e:
            print(f"Error counting sequences in {fasta_file}: {e}", flush=True)
            return 0

def BLAST(ncbi_reference):
    tools = BLASTTools()
    
    print("=" * 40, flush=True)
    print("BLAST - Species Assignment\n", flush=True)
    
    length_filter_dir = "/app/data/outputs/filter"
    blast_output_dir = "/app/data/outputs/blast"
    
    os.makedirs(blast_output_dir, exist_ok=True)
    
    if not ncbi_reference:
        print("NCBI reference does not exist", flush=True)
        return
    
    print(f"NCBI reference: {ncbi_reference}", flush=True)
    
    # -- check NCBI sequence amount
    ref_seq_count = tools.count_sequences_in_fasta(ncbi_reference)
    print(f"NCBI reference sequence amount: {ref_seq_count}", flush=True)
    
    # -- makeblastdb
    print(f"\nProcessing makeblastdb...", flush=True)
    try:
        db_name = tools.makeblastdb(ncbi_reference)
        print(f"makeblastdb created successfully: {db_name}", flush=True)
    except Exception as e:
        print(f"makeblastdb creation failed: {e}", flush=True)
        return
    print(flush=True)
    
    # -- find all .assembled.len.fa files
    species_files = []
    for len_file in Path(length_filter_dir).glob("*.assembled.len.fasta"):
        species_name = len_file.name.split('.')[0]
        species_files.append({
            'species': species_name,
            'input_file': str(len_file)
        })
        
        seq_count = tools.count_sequences_in_fasta(len_file)
        file_size = len_file.stat().st_size
        
        print(f"Species: {species_name}", flush=True)
        print(f"  Input file: {len_file.name} ({seq_count} sequences, {file_size} bytes)", flush=True)
    
    if not species_files:
        print("Unable to find .assembled.len.fa file", flush=True)
        return
    
    print(f"\nFound {len(species_files)} species {'file' if len(species_files) == 1 else 'files'}", flush=True)
    
    # -- process every species
    results = {}
    for species_data in species_files:
        species = species_data['species']
        input_file = species_data['input_file']
        output_file = f"{blast_output_dir}/{species}.dloop.bln"
        
        print(f"\nProcessing species: {species}", flush=True)
        
        try:
            blast_result = tools.blastn(
                query_file=input_file,
                database=ncbi_reference,
                output_file=output_file,
                outfmt=10,
                num_alignments=10,
                num_threads=4
            )
            
            print(f"{species} BLAST search completed", flush=True)
            
            if os.path.exists(output_file):
                with open(output_file, 'r') as f:
                    hit_count = sum(1 for line in f if line.strip())
                
                file_size = Path(output_file).stat().st_size
                print(f"  Output file: {Path(output_file).name} ({hit_count} hits, {file_size} bytes)", flush=True)
                
            else:
                print(f"Output file not generated", flush=True)
            
            results[species] = {
                'input_file': input_file,
                'output_file': output_file,
                'success': True
            }
            
        except Exception as e:
            print(f"{species} processing failed: {e}", flush=True)
            results[species] = {
                'input_file': input_file,
                'output_file': output_file,
                'success': False,
                'error': str(e)
            }
            continue
    
    # -- summary report
    successful = sum(1 for r in results.values() if r['success'])
    print(f"\nProcessing completed, processed {successful}/{len(results)} project", flush=True)
    
    return results

def list_available_files(ncbi_reference):
    print("Checking directory structure...", flush=True)
    
    filter_dir = "/app/data/outputs/filter"
    if os.path.exists(filter_dir):
        print(f"\nLength filter output directory: {filter_dir}", flush=True)
        for file in sorted(Path(filter_dir).glob("*")):
            size = file.stat().st_size if file.exists() else 0
            print(f"  {file.name} ({size} bytes)", flush=True)
    else:
        print(f"Length filter output directory does not exits: {filter_dir}", flush=True)
    
    blast_dir = "/app/data/outputs/blast"
    if os.path.exists(blast_dir):
        print(f"\nBLAST output directory: {blast_dir}", flush=True)
        files = list(Path(blast_dir).glob("*"))
        if files:
            for file in sorted(files):
                size = file.stat().st_size if file.exists() else 0
                print(f"  {file.name} ({size} bytes)", flush=True)
        else:
            print("  (empty directory)", flush=True)
    else:
        print(f"BLAST output directory: {blast_dir} (will be created)", flush=True)
    
    # -- Check NCBI reference
    print(f"\nChecking NCBI reference sequence...", flush=True)
    reference_dir = "/app/data/outputs/" + ncbi_reference
    
    if os.path.exists(reference_dir):
        size = Path(reference_dir).stat().st_size
        print(f" {reference_dir} ({size} bytes)", flush=True)
    else:
        print(f" {reference_dir} (does not exits)", flush=True)


if __name__ == "__main__":
    ncbi_reference = sys.argv[1] # -- string
    list_available_files(ncbi_reference)
    print(flush=True)
    
    BLAST(ncbi_reference)