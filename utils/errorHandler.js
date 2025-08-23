
const errorMessages = {
  // Errores de duplicación
  'Duplicate entry': {
    'articulo.nombre': 'Ya existe un artículo con ese nombre en el sistema',
    'articulo.codigo': 'Ya existe un artículo con ese código en esta categoría',
    'categoria.nombre': 'Ya existe una categoría con ese nombre',
    'usuario.email': 'Ya existe un usuario con ese correo electrónico',
    'default': 'El registro ya existe en el sistema'
  },
  
  // Errores de restricciones de clave foránea
  'Cannot add or update a child row': 'No se puede crear el registro porque la categoría seleccionada no existe',
  'Cannot delete or update a parent row': 'No se puede eliminar porque tiene registros relacionados',
  
  // Errores de validación
  'Data too long': 'Los datos ingresados son demasiado largos',
  'Incorrect integer value': 'El valor ingresado no es un número válido',
  'Incorrect decimal value': 'El valor ingresado no es un número decimal válido',
  'Invalid date': 'La fecha ingresada no es válida',
  
  // Errores de conexión
  'ECONNREFUSED': 'No se puede conectar con la base de datos',
  'ETIMEDOUT': 'La conexión con la base de datos ha expirado',
  
  // Errores de permisos
  'Access denied': 'No tienes permisos para realizar esta acción',
  'Table doesn\'t exist': 'La tabla solicitada no existe',
  
  // Errores de sintaxis SQL
  'You have an error in your SQL syntax': 'Error en la consulta de base de datos',
  
  // Errores de campos requeridos
  'Field': {
    'nombre': 'El nombre es requerido',
    'codigo': 'El código es requerido',
    'unidad': 'La unidad es requerida',
    'icono': 'El icono es requerido',
    'email': 'El correo electrónico es requerido',
    'password': 'La contraseña es requerida',
    'default': 'Este campo es requerido'
  }
};

/**
 * Función para convertir errores de MySQL en mensajes amigables
 * @param {Error} error - Error original de MySQL
 * @param {string} context - Contexto del error (ej: 'articulo', 'categoria')
 * @returns {string} Mensaje amigable para el usuario
 */
const getFriendlyErrorMessage = (error, context = '') => {
  const errorMessage = error.message || error;
  
  // Si es un error de duplicación
  if (errorMessage.includes('Duplicate entry')) {
    // Extraer el campo específico del error
    const fieldMatch = errorMessage.match(/for key '([^']+)'/);
    if (fieldMatch) {
      const field = fieldMatch[1];
      const tableField = field.split('.');
      if (tableField.length === 2) {
        const table = tableField[0];
        const fieldName = tableField[1];
        
        if (errorMessages['Duplicate entry'][field]) {
          return errorMessages['Duplicate entry'][field];
        }
      }
    }
    return errorMessages['Duplicate entry']['default'];
  }
  
  // Si es un error de restricción de clave foránea
  if (errorMessage.includes('Cannot add or update a child row')) {
    return errorMessages['Cannot add or update a child row'];
  }
  
  if (errorMessage.includes('Cannot delete or update a parent row')) {
    return errorMessages['Cannot delete or update a parent row'];
  }
  
  // Si es un error de validación de datos
  if (errorMessage.includes('Data too long')) {
    return errorMessages['Data too long'];
  }
  
  if (errorMessage.includes('Incorrect integer value')) {
    return errorMessages['Incorrect integer value'];
  }
  
  if (errorMessage.includes('Incorrect decimal value')) {
    return errorMessages['Incorrect decimal value'];
  }
  
  if (errorMessage.includes('Invalid date')) {
    return errorMessages['Invalid date'];
  }
  
  // Si es un error de conexión
  if (errorMessage.includes('ECONNREFUSED')) {
    return errorMessages['ECONNREFUSED'];
  }
  
  if (errorMessage.includes('ETIMEDOUT')) {
    return errorMessages['ETIMEDOUT'];
  }
  
  // Si es un error de permisos
  if (errorMessage.includes('Access denied')) {
    return errorMessages['Access denied'];
  }
  
  if (errorMessage.includes('Table doesn\'t exist')) {
    return errorMessages['Table doesn\'t exist'];
  }
  
  // Si es un error de sintaxis SQL
  if (errorMessage.includes('You have an error in your SQL syntax')) {
    return errorMessages['You have an error in your SQL syntax'];
  }
  
  // Si es un error de campo requerido
  if (errorMessage.includes('Field') && errorMessage.includes('doesn\'t have a default value')) {
    const fieldMatch = errorMessage.match(/Field '([^']+)'/);
    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      if (errorMessages['Field'][fieldName]) {
        return errorMessages['Field'][fieldName];
      }
      return errorMessages['Field']['default'];
    }
  }
  
  // Si no se encuentra un mensaje específico, devolver un mensaje genérico
  return 'Ha ocurrido un error inesperado. Por favor, inténtalo de nuevo.';
};

/**
 * Función para manejar errores de validación específicos del contexto
 * @param {string} context - Contexto del error (ej: 'articulo', 'categoria')
 * @param {string} field - Campo específico que causó el error
 * @param {string} value - Valor que causó el error
 * @returns {string} Mensaje específico del contexto
 */
const getContextSpecificError = (context, field, value) => {
  const contextErrors = {
    articulo: {
      nombre: `El nombre "${value}" ya está registrado en el sistema`,
      codigo: `El código "${value}" ya está registrado en esta categoría`,
      stock: 'El stock debe ser un número mayor o igual a 0',
      fecha_vencimiento: 'La fecha de vencimiento no puede ser anterior a hoy',
      unidad: 'La unidad debe ser un valor válido (ej: kg, litros, unidades)'
    },
    categoria: {
      nombre: `La categoría "${value}" ya existe en el sistema`,
      icono: 'Debes seleccionar un icono para la categoría',
      descripcion: 'La descripción no puede exceder los 500 caracteres'
    },
    usuario: {
      email: `El correo electrónico "${value}" ya está registrado`,
      password: 'La contraseña debe tener al menos 6 caracteres',
      nombre: 'El nombre debe tener al menos 2 caracteres'
    }
  };
  
  if (contextErrors[context] && contextErrors[context][field]) {
    return contextErrors[context][field];
  }
  
  return `Error en el campo ${field}`;
};

/**
 * Función para crear respuestas de error consistentes
 * @param {Error} error - Error original
 * @param {string} context - Contexto del error
 * @param {string} operation - Operación que se estaba realizando
 * @returns {Object} Objeto de respuesta de error estandarizado
 */
const createErrorResponse = (error, context = '', operation = '') => {
  const friendlyMessage = getFriendlyErrorMessage(error, context);
  
  return {
    success: false,
    message: friendlyMessage,
    error: {
      original: error.message || error,
      context: context,
      operation: operation,
      timestamp: new Date().toISOString()
    }
  };
};

module.exports = {
  getFriendlyErrorMessage,
  getContextSpecificError,
  createErrorResponse
};
