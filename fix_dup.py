import io

path = "lib/actions/product.actions.ts"

with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find all occurrences of the bulkDeleteAllPages function
# The function has a unique signature: "export async function bulkDeleteAllPages("

occurrences = []
in_func = False
func_start = None
func_end = None

for i, line in enumerate(lines):
    if "export async function bulkDeleteAllPages(" in line:
        if not in_func:
            # Start of a function
            in_func = True
            func_start = i
        else:
            # This is the second occurrence - mark the end
            func_end = i
            break

if func_start is not None and func_end is not None:
    # Remove the second occurrence (from func_start to func_end, inclusive)
    # Keep the first occurrence
    print(f"Removing duplicate function from line {func_start+1} to {func_end+1}")
    del lines[func_start:func_end+1]
    with io.open(path, "w", encoding="utf-8") as f:
        f.writelines(lines)
    print("Fixed! New line count:", len(lines))
else:
    print("Could not find duplicate")
    if func_start is not None:
        print(f"First occurrence at line {func_start+1}, no second found")
