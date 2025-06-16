document.addEventListener('DOMContentLoaded', function() {
    // Get current date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').value = today;
    
    // Initialize expenses array from localStorage or empty array
    let expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    
    // DOM elements
    const expenseForm = document.getElementById('expenseForm');
    const expensesList = document.getElementById('expensesList');
    const totalExpenses = document.getElementById('totalExpenses');
    const monthlyExpenses = document.getElementById('monthlyExpenses');
    const filterSelect = document.getElementById('filter');
    
    // Chart variables
    let pieChart, barChart;
    
    // Initialize the app
    updateExpensesList();
    updateSummary();
    initializeCharts();
    
    // Event listeners
    expenseForm.addEventListener('submit', addExpense);
    filterSelect.addEventListener('change', filterExpenses);
    
    // Add new expense
    function addExpense(e) {
        e.preventDefault();
        
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        
        const newExpense = {
            id: Date.now(),
            description,
            amount,
            category,
            date
        };
        
        expenses.unshift(newExpense);
        saveExpenses();
        updateExpensesList();
        updateSummary();
        updateCharts();
        
        // Reset form
        expenseForm.reset();
        document.getElementById('date').value = today;
        
        // Scroll to the new expense
        const newExpenseElement = document.getElementById(`expense-${newExpense.id}`);
        if (newExpenseElement) {
            newExpenseElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
    
    // Update expenses list in the DOM
    function updateExpensesList(filterType = 'all') {
        if (expenses.length === 0) {
            expensesList.innerHTML = `
                <div class="py-4 text-center text-gray-500">
                    No expenses added yet. Start by adding your first expense above!
                </div>
            `;
            return;
        }
        
        let filteredExpenses = [...expenses];
        const now = new Date();
        
        if (filterType === 'week') {
            const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filteredExpenses = expenses.filter(exp => new Date(exp.date) >= oneWeekAgo);
        } else if (filterType === 'month') {
            const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            filteredExpenses = expenses.filter(exp => new Date(exp.date) >= oneMonthAgo);
        } else if (filterType === 'year') {
            const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            filteredExpenses = expenses.filter(exp => new Date(exp.date) >= oneYearAgo);
        }
        
        if (filteredExpenses.length === 0) {
            expensesList.innerHTML = `
                <div class="py-4 text-center text-gray-500">
                    No expenses found for the selected period.
                </div>
            `;
            return;
        }
        
        expensesList.innerHTML = filteredExpenses.map(expense => {
            const date = new Date(expense.date);
            const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            
            const icon = getCategoryIcon(expense.category);
            const color = getCategoryColor(expense.category);
            
            return `
                <div id="expense-${expense.id}" class="expense-item fade-in py-4 px-2 transition-all duration-200 cursor-pointer">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <div class="w-10 h-10 rounded-full <span class="math-inline">\{color\.bg\} flex items\-center justify\-center"\>
<i class\="</span>{icon} <span class="math-inline">\{color\.text\} text\-lg"\></i\>
</div\>
<div\>
<p class\="font\-medium text\-gray\-800"\></span>{expense.description}</p>
                                <p class="text-sm text-gray-500">${formattedDate}</p>
                            </div>
                        </div>
                        <div class="text-right">
                            <p class="font-bold text-gray-800">Ksh ${expense.amount.toFixed(2)}</p>
                            <span class="text-xs px-2 py-1 rounded-full ${color.bg} <span class="math-inline">\{color\.text\} font\-medium"\></span>{expense.category}</span>
                        </div>
                    </div>
                    <div class="mt-3 flex justify-end space-x-2">
                        <button onclick="deleteExpense(${expense.id})" class="text-red-500 hover:text-red-700 text-sm flex items-center">
                            <i class="fas fa-trash-alt mr-1"></i> Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }
    
    // Filter expenses based on time period
    function filterExpenses() {
        const filterType = filterSelect.value;
        updateExpensesList(filterType);
    }
    
    // Delete an expense
    window.deleteExpense = function(id) {
        if (confirm('Are you sure you want to delete this expense?')) {
            expenses = expenses.filter(exp => exp.id !== id);
            saveExpenses();
            updateExpensesList(filterSelect.value);
            updateSummary();
            updateCharts();
        }
    }
    
    // Update summary information
    function updateSummary() {
        const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
        totalExpenses.textContent = `Ksh ${total.toFixed(2)}`;
        
        const now = new Date();
        const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const monthlyTotal = expenses
            .filter(exp => new Date(exp.date) >= oneMonthAgo)
            .reduce((sum, exp) => sum + exp.amount, 0);
        monthlyExpenses.textContent = `Ksh ${monthlyTotal.toFixed(2)}`;
    }
    
    // Initialize charts
    function initializeCharts() {
        // Pie chart for categories
        const pieCtx = document.getElementById('pieChart').getContext('2d');
        pieChart = new Chart(pieCtx, {
            type: 'pie',
            data: getPieChartData(),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${label}: Ksh <span class="math-inline">\{value\.toFixed\(2\)\} \(</span>{percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
        
        // Bar chart for monthly trends
        const barCtx = document.getElementById('barChart').getContext('2d');
        barChart = new Chart(barCtx, {
            type: 'bar',
            data: getBarChartData(),
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return 'Ksh ' + value;
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.dataset.label || '';
                                const value = context.raw || 0;
                                return `${label}: Ksh ${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        });
    }
})
