#!/usr/bin/env python3

"""
Rename and trim DNA Analysis Pipeline
Combines rename and trim operations for paired-end sequencing data.
Modified to output only the species specified in quality_config_file.

Usage: python rename_trim.py <R1_fastq> <R2_fastq> <barcode_csv> <quality_config_json>

Flow:
1. Rename R1 reads → temp files
2. Rename R2 reads → temp files
3. Trim paired reads using barcode file → outputs/
4. Output ONLY the selected species files with custom quality standards
"""

import sys
import os
import json
from pathlib import Path
from collections import defaultdict
from typing import Dict, List, Tuple, Optional, TextIO

sys.stdout = os.fdopen(sys.stdout.fileno(), 'w', 1)  # 行緩衝
sys.stderr = os.fdopen(sys.stderr.fileno(), 'w', 1)  # 行緩衝


def rename_fastq_file(input_file: str, output_file: str) -> None:
    """
    Rename reads in a FASTQ file by file name using read counts.
    """
    print(f"Renaming reads in: {input_file}", flush=True)
    
    # Ensure output directory exists
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)
    
    # Extract pair identifier (R1 or R2)
    filename = Path(input_file).name
    if '_R1' in filename:
        pair = 'R1'
    elif '_R2' in filename:
        pair = 'R2'
    else:
        # Fallback to last part before extension
        pair = filename.split('_')[-1][0:2]
    
    read_counts = 0
    
    with open(output_file, 'w') as outfile:
        with open(input_file, 'r') as infile:
            for i, line in enumerate(infile):
                line = line.rstrip()
                if i % 4 == 0:  # Header line
                    outfile.write("@" + pair + "_" + str(read_counts))
                    outfile.write("\n")
                    read_counts += 1
                else:
                    outfile.write(line)
                    outfile.write("\n")
    
    print(f"Renamed {read_counts} reads. Output: {output_file}", flush=True)


class FastqRecord:
    """Represents a single FASTQ record with header, sequence, and quality."""
    
    def __init__(self, header: str, sequence: str, quality: str):
        self.header = header
        self.sequence = sequence
        self.quality = quality
        self.index = self._extract_index()
    
    def _extract_index(self) -> str:
        """Extract read index from header."""
        return self.header.split('_')[1] if '_' in self.header else ""
    
    def trim_sequence(self, trim_length: int) -> 'FastqRecord':
        """Return a new FastqRecord with trimmed sequence and quality."""
        return FastqRecord(
            self.header,
            self.sequence[trim_length:],
            self.quality[trim_length:]
        )


class BarcodeDatabase:
    """Manages barcode and primer sequences."""
    
    def __init__(self, tagfile: str, target_species: str):
        self.tags = {}
        self.target_species = target_species  # 新增：目標物種
        self.species_prefixes = set()
        self._load_tags(tagfile)
    
    def _load_tags(self, tagfile: str) -> None:
        """Load barcode and primer sequences from CSV file, filtered by target species."""
        print(f"Loading barcode file: {tagfile}", flush=True)
        print(f"Target species: {self.target_species}", flush=True)
        
        total_entries = 0
        filtered_entries = 0
        
        with open(tagfile, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                    
                fields = line.split(',')
                if len(fields) >= 7:
                    location = fields[0]
                    total_entries += 1
                    
                    # Extract species prefix
                    species_prefix = location.split('_')[0] if '_' in location else location
                    
                    # 只載入目標物種的條碼
                    if species_prefix == self.target_species:
                        # Store: barcode_f, primer_f, barcode_r, primer_r
                        self.tags[location] = fields[3:7]
                        self.species_prefixes.add(species_prefix)
                        filtered_entries += 1
        
        print(f"Total entries in barcode file: {total_entries}", flush=True)
        print(f"Loaded {filtered_entries} entries for target species '{self.target_species}'", flush=True)
        
        if filtered_entries == 0:
            print(f"WARNING: No barcode entries found for species '{self.target_species}'", flush=True)
    
    def get_combined_tags(self, location: str) -> Tuple[str, str]:
        """Get combined forward and reverse tags for a location."""
        barcode_f, primer_f, barcode_r, primer_r = self.tags[location]
        return barcode_f + primer_f, barcode_r + primer_r


class FastqProcessor:
    """Processes paired-end FASTQ files."""
    
    def __init__(self, r1_file: str, r2_file: str):
        self.r1_file = r1_file
        self.r2_file = r2_file
        self.paired_reads = {}
    
    def load_reads(self) -> None:
        """Load paired-end reads into memory."""
        print("Loading R1 reads...", flush=True)
        r1_reads = self._load_fastq_file(self.r1_file)
        
        print("Loading R2 reads...", flush=True)
        r2_reads = self._load_fastq_file(self.r2_file)
        
        # Combine R1 and R2 reads
        for index in r1_reads:
            if index in r2_reads:
                self.paired_reads[index] = (r1_reads[index], r2_reads[index])
        
        print(f"Loaded {len(self.paired_reads)} paired reads", flush=True)
    
    def _load_fastq_file(self, filename: str) -> Dict[str, FastqRecord]:
        """Load FASTQ file and return dictionary of reads indexed by read index."""
        reads = {}
        
        with open(filename, 'r', encoding='utf-8') as f:
            lines = [line.strip() for line in f]
        
        # Process FASTQ in chunks of 4 lines
        for i in range(0, len(lines), 4):
            if i + 3 < len(lines):
                header = lines[i]
                sequence = lines[i + 1]
                quality = lines[i + 3]
                
                record = FastqRecord(header, sequence, quality)
                if record.index:
                    reads[record.index] = record
        
        return reads


class SequenceMatcher:
    """Handles sequence matching and mismatch calculation."""
    
    @staticmethod
    def hamming_distance(seq1: str, seq2: str) -> int:
        """Calculate Hamming distance between two sequences of equal length."""
        if len(seq1) != len(seq2):
            return float('inf')
        
        return sum(c1 != c2 for c1, c2 in zip(seq1.upper(), seq2.upper()))
    
    @staticmethod
    def find_best_orientation(tag_f: str, tag_r: str, r1_seq: str, r2_seq: str) -> Tuple[str, int, int, int, int]:
        """
        Find the best orientation for tag matching.
        Returns: (orientation, mismatch_f, mismatch_r, len_tag_f, len_tag_r)
        """
        len_tag_f = len(tag_f)
        len_tag_r = len(tag_r)
        
        # R1f + R2r orientation
        mismatch_r1f = SequenceMatcher.hamming_distance(tag_f, r1_seq[:len_tag_f])
        mismatch_r2r = SequenceMatcher.hamming_distance(tag_r, r2_seq[:len_tag_r])
        r1f_total = mismatch_r1f + mismatch_r2r
        
        # R2f + R1r orientation
        mismatch_r2f = SequenceMatcher.hamming_distance(tag_f, r2_seq[:len_tag_f])
        mismatch_r1r = SequenceMatcher.hamming_distance(tag_r, r1_seq[:len_tag_r])
        r2f_total = mismatch_r2f + mismatch_r1r
        
        if r1f_total <= r2f_total:
            return "R1f", mismatch_r1f, mismatch_r2r, len_tag_f, len_tag_r
        else:
            return "R2f", mismatch_r2f, mismatch_r1r, len_tag_f, len_tag_r


class OutputManager:
    """Manages output files for the target species only."""
    
    def __init__(self, target_species: str, quality_standard: int, output_dir: str = "/app/data/outputs/trim"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.file_handles = {}
        
        self.target_species = target_species
        self.quality_standard = quality_standard
        print(f"Target species: {target_species}, Quality standard: {quality_standard}", flush=True)
    
    def open_output_files(self) -> None:
        """Open output files for the target species only."""
        self.file_handles[self.target_species] = {
            'F': open(self.output_dir / f"{self.target_species}.f.fq", 'w', encoding='utf-8'),
            'R': open(self.output_dir / f"{self.target_species}.r.fq", 'w', encoding='utf-8')
        }
        print(f"Opened output files for species: {self.target_species}", flush=True)
    
    def close_all_files(self) -> None:
        """Close all open file handles."""
        for species_files in self.file_handles.values():
            for file_handle in species_files.values():
                file_handle.close()
    
    def write_trimmed_reads(self, read_index: str, location: str, orientation: str,
                           r1_record: FastqRecord, r2_record: FastqRecord,
                           mismatch_f: int, mismatch_r: int,
                           f_trim_len: int, r_trim_len: int) -> bool:
        """Write trimmed reads to output files. Returns True if written, False if filtered out."""
        species_prefix = location.split('_')[0] if '_' in location else location
        
        # 只處理目標物種
        if species_prefix != self.target_species:
            return False
        
        # 品質控制：檢查錯配是否超過標準
        if mismatch_f > self.quality_standard or mismatch_r > self.quality_standard:
            return False
        
        # Determine correct orientation and trim sequences
        if orientation == "R1f":
            f_record = r1_record.trim_sequence(f_trim_len)
            r_record = r2_record.trim_sequence(r_trim_len)
        else:  # R2f
            f_record = r2_record.trim_sequence(f_trim_len)
            r_record = r1_record.trim_sequence(r_trim_len)
        
        # Write forward read
        f_header = f"@f_{read_index}_{location}_{orientation}"
        self._write_fastq_record(self.file_handles[self.target_species]['F'], 
                                f_header, f_record.sequence, f_record.quality)
        
        # Write reverse read  
        r_header = f"@r_{read_index}_{location}_{orientation}"
        self._write_fastq_record(self.file_handles[self.target_species]['R'],
                                r_header, r_record.sequence, r_record.quality)
        
        return True
    
    def _write_fastq_record(self, file_handle: TextIO, header: str, sequence: str, quality: str) -> None:
        """Write a single FASTQ record to file."""
        file_handle.write(f"{header}\n{sequence}\n+\n{quality}\n")


class IntegratedPipeline:
    """Main pipeline that integrates rename and trim operations."""
    
    def __init__(self, r1_file: str, r2_file: str, barcode_file: str, quality_config: Dict[str, int]):
        self.r1_file = r1_file
        self.r2_file = r2_file
        self.barcode_file = barcode_file
        
        # 取得目標物種和品質標準
        if len(quality_config) != 1:
            raise ValueError(f"Quality config should contain exactly one species, got: {list(quality_config.keys())}")
        
        self.target_species = list(quality_config.keys())[0]
        self.quality_standard = quality_config[self.target_species]
        
        print(f"Pipeline configured for species: {self.target_species} (quality standard: {self.quality_standard})", flush=True)
        
        # Generate temporary file names for renamed files
        self.r1_renamed = self._get_renamed_filename(r1_file)
        self.r2_renamed = self._get_renamed_filename(r2_file)
        
        # Initialize trim components
        self.barcode_db = None
        self.fastq_processor = None
        self.output_manager = None
        self.matcher = SequenceMatcher()
        
        # Results tracking
        self.results = {}

    def _get_renamed_filename(self, original_file: str) -> str:
        """Generate renamed filename in outputs/rename directory."""
        file_path = Path(original_file)
        filename = file_path.stem
        
        rename_dir = Path("/app/data/outputs/rename")
        rename_dir.mkdir(parents=True, exist_ok=True)
        
        return str(rename_dir / f"{filename}.rename.fq")
    
    def run(self) -> None:
        """Run the complete rename and trim pipeline."""
        print("Starting rename and trim DNA analysis pipeline...", flush=True)
        print(f"Input files: {self.r1_file}, {self.r2_file}", flush=True)
        print(f"Barcode file: {self.barcode_file}", flush=True)
        print(f"Target species: {self.target_species} (quality standard: {self.quality_standard})", flush=True)
        
        try:
            # Step 1: Rename R1 reads
            print("\n=== Step 1: Renaming R1 reads ===", flush=True)
            rename_fastq_file(self.r1_file, self.r1_renamed)
            
            # Step 2: Rename R2 reads
            print("\n=== Step 2: Renaming R2 reads ===", flush=True)
            rename_fastq_file(self.r2_file, self.r2_renamed)
            
            # Step 3: Trim using renamed files
            print("\n=== Step 3: Barcode trimming ===", flush=True)
            self._run_trim_analysis()
            
            print(f"\nRename and trim completed successfully!", flush=True)
            print(f"Output files for {self.target_species} in: outputs/trim/", flush=True)
            
        except Exception as e:
            print(f"Pipeline failed: {str(e)}", flush=True)
            raise
    
    def _run_trim_analysis(self) -> None:
        """Run the trim analysis on renamed files."""
        # Initialize trim components with target species filter
        self.barcode_db = BarcodeDatabase(self.barcode_file, self.target_species)
        self.fastq_processor = FastqProcessor(self.r1_renamed, self.r2_renamed)
        self.output_manager = OutputManager(self.target_species, self.quality_standard)
        
        # Load renamed reads
        self.fastq_processor.load_reads()
        
        # Setup output files (only for target species)
        self.output_manager.open_output_files()
        
        try:
            # Process all reads for barcode matching
            self._process_all_reads()
            
            # Write trimmed results
            self._write_trimmed_results()
            
        finally:
            # Clean up
            self.output_manager.close_all_files()
    
    def _process_all_reads(self) -> None:
        """Process all paired reads for barcode/primer matching."""
        print("Processing reads for barcode/primer matching...", flush=True)
        
        total_reads = len(self.fastq_processor.paired_reads)
        
        for i, (read_index, (r1_record, r2_record)) in enumerate(self.fastq_processor.paired_reads.items()):
            if i % 10000 == 0:
                print(f"Processed {i}/{total_reads} reads", flush=True)
            
            best_match = self._find_best_barcode_match(r1_record, r2_record)
            
            if best_match:
                location, orientation, mismatch_f, mismatch_r, f_trim_len, r_trim_len = best_match
                
                # Store target results
                species_prefix = location.split('_')[0] if '_' in location else location
                if species_prefix == self.target_species:
                    self.results[read_index] = {
                        'location': location,
                        'orientation': orientation,
                        'mismatch_f': mismatch_f,
                        'mismatch_r': mismatch_r,
                        'f_trim_len': f_trim_len,
                        'r_trim_len': r_trim_len
                    }
    
    def _find_best_barcode_match(self, r1_record: FastqRecord, r2_record: FastqRecord) -> Optional[Tuple]:
        """Find the best barcode match for a read pair."""
        best_mismatch = float('inf')
        best_match = None
        
        # 只在目標物種的條碼中搜尋
        for location in self.barcode_db.tags.keys():
            tag_f, tag_r = self.barcode_db.get_combined_tags(location)
            
            orientation, mismatch_f, mismatch_r, f_len, r_len = self.matcher.find_best_orientation(
                tag_f, tag_r, r1_record.sequence, r2_record.sequence
            )
            
            total_mismatch = mismatch_f + mismatch_r
            
            if total_mismatch < best_mismatch:
                best_mismatch = total_mismatch
                best_match = (location, orientation, mismatch_f, mismatch_r, f_len, r_len)
        
        return best_match
    
    def _write_trimmed_results(self) -> None:
        """Write trimmed reads to output files."""
        print("Writing trimmed reads to output files...", flush=True)
        
        written_count = 0
        for read_index, result in self.results.items():
            if read_index in self.fastq_processor.paired_reads:
                r1_record, r2_record = self.fastq_processor.paired_reads[read_index]
                
                success = self.output_manager.write_trimmed_reads(
                    read_index=read_index,
                    location=result['location'],
                    orientation=result['orientation'],
                    r1_record=r1_record,
                    r2_record=r2_record,
                    mismatch_f=result['mismatch_f'],
                    mismatch_r=result['mismatch_r'],
                    f_trim_len=result['f_trim_len'],
                    r_trim_len=result['r_trim_len']
                )
                
                if success:
                    written_count += 1
        
        print(f"Successfully wrote {written_count} trimmed read pairs for project '{self.target_species}'", flush=True)


def load_quality_config(config_file: str) -> Dict[str, int]:
    """載入品質配置檔案"""
    try:
        with open(config_file, 'r', encoding='utf-8') as f:
            config_data = json.load(f)
        
        print(f"Loaded quality configuration: {config_data}", flush=True)
        
        # 驗證只有一個物種
        if len(config_data) != 1:
            raise ValueError(f"Quality config should contain exactly one species, got: {list(config_data.keys())}")
        
        return config_data
        
    except FileNotFoundError:
        print(f"Quality config file not found: {config_file}", flush=True)
        raise
    except json.JSONDecodeError as e:
        print(f"Invalid JSON in quality config file: {e}", flush=True)
        raise


def main():
    """Main function to run the rename and trim."""
    if len(sys.argv) != 5:
        print("Usage: python rename_trim.py <R1_fastq> <R2_fastq> <barcode_csv> <quality_config_json>", flush=True)
        print("Example: python rename_trim.py sample_R1.fastq sample_R2.fastq barcodes.csv quality_config.json", flush=True)
        print("Note: quality_config.json should contain exactly one species", flush=True)
        sys.exit(1)
    
    r1_file = sys.argv[1]
    r2_file = sys.argv[2]
    barcode_file = sys.argv[3]
    quality_config_file = sys.argv[4]
    
    # 檢查檔案是否存在
    for file_path in [r1_file, r2_file, barcode_file, quality_config_file]:
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} not found", flush=True)
            sys.exit(1)
    
    # 載入品質配置
    quality_config = load_quality_config(quality_config_file)
    
    # 執行分析管道
    pipeline = IntegratedPipeline(r1_file, r2_file, barcode_file, quality_config)
    pipeline.run()


if __name__ == "__main__":
    main()