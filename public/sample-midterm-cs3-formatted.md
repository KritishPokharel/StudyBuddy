# COMPUTER SCIENCE III - MIDTERM EXAMINATION
## Fall 2024

**Student Name:** John Doe  
**Student ID:** CS2024-12345  
**Date:** October 15, 2024  
**Total Marks:** 50

---

## QUESTION 1 (10 marks)

**Question:** Explain the time complexity of Merge Sort algorithm. Provide a detailed analysis of both best-case and worst-case scenarios.

**Student Answer:**  
Merge sort has a time complexity of O(n log n) in all cases because it divides the array into halves recursively and then merges them. The divide step takes O(log n) and the merge step takes O(n), so overall it's O(n log n).

**Marks:** 8/10 | **Status:** Partially Correct

---

## QUESTION 2 (10 marks)

**Question:** What data structure does Depth-First Search (DFS) use? Explain why.

**Student Answer:**  
DFS uses a queue data structure to keep track of nodes to visit.

**Marks:** 0/10 | **Status:** Incorrect

---

## QUESTION 3 (10 marks)

**Question:** Given the following code snippet, what is its time complexity?
```cpp
for (int i = 0; i < n; i *= 2) {
    // some O(1) operation
}
```

**Student Answer:**  
The time complexity is O(n) because the loop runs n times.

**Marks:** 0/10 | **Status:** Incorrect

---

## QUESTION 4 (10 marks)

**Question:** Explain the difference between a Binary Search Tree (BST) and a Balanced BST. What is the worst-case time complexity for insertion in each?

**Student Answer:**  
A BST is a tree where left child < parent < right child. A balanced BST maintains this property but also keeps the tree height-balanced. Insertion in BST is always O(log n), and in balanced BST it's also O(log n).

**Marks:** 6/10 | **Status:** Partially Correct

---

## QUESTION 5 (10 marks)

**Question:** What is the space complexity of the recursive implementation of Fibonacci using memoization? Explain your answer.

**Student Answer:**  
The space complexity is O(n) because we need to store n values in the memoization table, and the recursion stack also takes O(n) space.

**Marks:** 10/10 | **Status:** Correct

---

## SUMMARY

**Total Marks Received:** 24/50  
**Percentage:** 48%

**Grader Signature:** Prof. Smith  
**Date Graded:** October 20, 2024

