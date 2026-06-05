document.addEventListener('DOMContentLoaded', function() {
  // Auto-dismiss alerts after 5 seconds
  const alerts = document.querySelectorAll('.alert:not(.alert-permanent)');
  alerts.forEach(alert => {
    setTimeout(() => {
      const bsAlert = new bootstrap.Alert(alert);
      bsAlert.close();
    }, 5000);
  });

  // Form validation
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', function(e) {
      if (form.checkValidity() === false) {
        e.preventDefault();
        e.stopPropagation();
      }
      form.classList.add('was-validated');
    });
  });

  // Confirm delete actions
  const deleteButtons = document.querySelectorAll('[data-action="delete"]');
  deleteButtons.forEach(btn => {
    btn.addEventListener('click', function(e) {
      if (!confirm('Tem certeza que deseja deletar este item?')) {
        e.preventDefault();
      }
    });
  });
});

// Utility function to format currency
function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Utility function to format date
function formatDate(dateString) {
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Date(dateString).toLocaleDateString('pt-BR', options);
}

// Show loading spinner
function showLoading(element) {
  const spinner = document.createElement('div');
  spinner.className = 'spinner';
  element.appendChild(spinner);
}

// Hide loading spinner
function hideLoading(element) {
  const spinner = element.querySelector('.spinner');
  if (spinner) {
    spinner.remove();
  }
}
