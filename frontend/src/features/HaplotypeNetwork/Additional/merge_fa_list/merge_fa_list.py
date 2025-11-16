# merge_fa_list.py

def read_fa(fa_file):
    """讀取FA檔，回傳 {uniq_id: sequence}"""
    seqs = {}
    current_id = None
    current_seq = []
    with open(fa_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith(">"):
                if current_id:
                    seqs[current_id] = "\n".join(current_seq)
                current_id = line[1:]  # 去掉 ">"
                current_seq = []
            else:
                current_seq.append(line)
        if current_id:
            seqs[current_id] = "\n".join(current_seq)
    return seqs


def read_list(list_file):
    """讀取LIST檔，回傳 {uniq_id: [f_ids]}"""
    mapping = {}
    with open(list_file, 'r') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith(">"):
                parts = line[1:].split("\t")
                uniq_id = parts[0]
                f_ids = parts[1].split(",")
                mapping[uniq_id] = f_ids
    return mapping


def merge_fa_list(fa_dict, list_dict, output_file):
    """合併並輸出"""
    with open(output_file, 'w') as out:
        for uniq_id, f_ids in list_dict.items():
            if uniq_id not in fa_dict:
                print(f"警告: {uniq_id} 在FA檔中找不到，跳過。")
                continue
            seq = fa_dict[uniq_id]
            for f_id in f_ids:
                out.write(f">{f_id},{uniq_id}\n{seq}\n")


if __name__ == "__main__":
    fa_file = "Zpl.dup.msa.fa"
    list_file = "Zpl.dup.list"
    output_file = "merged.fa"

    fa_dict = read_fa(fa_file)
    list_dict = read_list(list_file)
    merge_fa_list(fa_dict, list_dict, output_file)

    print(f"合併完成，輸出檔案: {output_file}")
