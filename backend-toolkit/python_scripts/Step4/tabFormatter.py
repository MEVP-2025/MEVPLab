import os
import glob

def process_fasta(input_file, output_file):
    """
    Read FASTA file and convert format
    Convert each sequence to: name\tsequence format
    """
    with open(input_file, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    processed_data = []
    current_name = ""
    current_sequence = ""
    
    for line in lines:
        line = line.strip()
        
        if line.startswith('>'):
            if current_name:  # -- process previous sequence first
                processed_data.append(f"{current_name}\t{current_sequence}")
            
            # -- remove the leading '>'
            current_name = line[1:]
            current_sequence = ""
        else:
            current_sequence += line
    
    # -- process the last sequence
    if current_name:
        processed_data.append(f"{current_name}\t{current_sequence}")
    
    with open(output_file, 'w', encoding='utf-8') as f:
        for line in processed_data:
            f.write(line + '\n')
    
    print(f"Processing complete! Processed {len(processed_data)} sequences", flush=True)
    print(f"Results saved to {output_file}", flush=True)

# Usage example
if __name__ == "__main__":
    input_dir = "/app/data/outputs/mafft"
    output_dir = "/app/data/outputs/tab_formatter"
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Find all FASTA files in mafft_output directory
    fasta_files = glob.glob(os.path.join(input_dir, "*.fa"))
    
    if not fasta_files:
        print(f"No FASTA files found in {input_dir}", flush=True)
    else:
        # Process each FASTA file
        for input_file in fasta_files:
            # Get the base filename without extension
            base_name = os.path.splitext(os.path.basename(input_file))[0]
            
            # Create output filename with .txt extension
            output_file = os.path.join(output_dir, f"{base_name}.tab")
            
            print(f"Processing: {input_file}", flush=True)
            process_fasta(input_file, output_file)
            print(f"Successfully processed: {base_name}", flush=True)
            print("-" * 50, flush=True)
        
        print("Batch processing completed!", flush=True)