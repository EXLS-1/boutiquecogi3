import io

path = "lib/actions/product.actions.ts"

with io.open(path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Find and remove duplicate bulkChangeStatus
# First occurrence at line 425, second at line 536
# We need to remove lines 536 to end of second function

# Find the end of the second bulkChangeStatus function
# Start from line 536 (index 535)
for i in range(535, len(lines)):
    if 'export async function bulkChangeStatus(' in lines[i]:
        # This is the second occurrence - remove from here
        # Find the end: it should end with '}'
        # Count braces
        brace_count = 0
        found_try = False
        end = i
        for j in range(i, len(lines)):
            if 'try' in lines[j] and '{' in lines[j]:
                found_try = True
            if '{' in lines[j]:
                brace_count += 1
            if '}' in lines[j]:
                brace_count -= 1
                if found_try and brace_count == 0:
                    end = j
                    break
        print(f"Removing second bulkChangeStatus from line {i+1} to {end+1}")
        del lines[i:end+1]
        break

# Now fix bulkDeleteAllPages
# First occurrence at line 466, second at line 584
for i in range(583, len(lines)):
    if 'export async function bulkDeleteAllPages(' in lines[i]:
        # This is the second occurrence - remove from here
        brace_count = 0
        found_try = False
        end = i
        for j in range(i, len(lines)):
            if 'try' in lines[j] and '{' in lines[j]:
                found_try = True
            if '{' in lines[j]:
                brace_count += 1
            if '}' in lines[j]:
                brace_count -= 1
                if found_try and brace_count == 0:
                    end = j
                    break
        print(f"Removing second bulkDeleteAllPages from line {i+1} to {end+1}")
        del lines[i:end+1]
        break

with io.open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Fixed! New line count:", len(lines))
