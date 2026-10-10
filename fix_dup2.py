import io
import re

path = "lib/actions/product.actions.ts"

with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find all function declarations and remove duplicates
# We'll process functions one by one

# List of functions to check for duplicates
functions_to_check = [
    "bulkDeleteProducts",
    "bulkUpdateProducts",
    "bulkChangeStatus",
    "bulkDeleteAllPages",
]

# Process each function
for func_name in functions_to_check:
    func_pattern = re.compile(r"export\s+async\s+function\s+" + func_name + r"\s*\(")
    
    # Find all occurrences
    occurrences = []
    for i, line in enumerate(lines):
        if func_pattern.search(line):
            occurrences.append(i)
    
    print(f"'{func_name}' found at lines: {[o+1 for o in occurrences]}")
    
    # Remove duplicates (keep the first occurrence)
    if len(occurrences) > 1:
        # Find the end of each function
        for idx, occ in enumerate(occurrences):
            if idx == 0:
                continue  # Keep the first one
            
            # Find the end of this function (the closing brace)
            brace_count = 0
            found_open = False
            end = occ  # Initialize end to avoid NameError
            for j in range(occ, len(lines)):
                if "{" in lines[j]:
                    brace_count += 1
                    found_open = True
                elif "}" in lines[j]:
                    brace_count -= 1
                    if found_open:
                        if brace_count == 0:
                            end = j
                            break
            
            print(f"  Removing duplicate at lines {occ+1} to {end+1}")
            del lines[occ:end+1]

with io.open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed! New line count:", len(lines))
