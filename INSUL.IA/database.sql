-- Crear la base de datos
CREATE DATABASE IF NOT EXISTS sistema_diabetes;
USE sistema_diabetes;

-- =============================================
-- TABLA USUARIO PRINCIPAL (con login)
-- =============================================
CREATE TABLE UsuarioPrincipal (
    usuarioID INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    sexo ENUM('M', 'F', 'Otro') NOT NULL,
    fechaNacimiento DATE NOT NULL,
    domicilio VARCHAR(255),
    celular VARCHAR(20),
    correo VARCHAR(100) UNIQUE NOT NULL,
    contraseña VARCHAR(255) NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_correo (correo)
);

-- =============================================
-- TABLA USUARIO SECUNDARIO
-- =============================================
CREATE TABLE UsuarioSecundario (
    pacienteID INT PRIMARY KEY AUTO_INCREMENT,
    usuarioPrincipalID INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    sexo ENUM('M', 'F', 'Otro') NOT NULL,
    fechaNacimiento DATE NOT NULL,
    domicilio VARCHAR(255),
    celular VARCHAR(20),
    parentesco VARCHAR(50),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuarioPrincipalID) REFERENCES UsuarioPrincipal(usuarioID) ON DELETE CASCADE,
    INDEX idx_principal (usuarioPrincipalID),
    INDEX idx_nombre (nombre)
);

-- =============================================
-- TABLA DATOS_CLINICOS
-- =============================================
CREATE TABLE DATOS_CLINICOS (
    datosID INT PRIMARY KEY AUTO_INCREMENT,
    pacienteID INT NOT NULL,
    embarazos INT NOT NULL DEFAULT 0,
    glucosa DECIMAL(5,2) NOT NULL,
    presionSangina DECIMAL(5,2) NOT NULL,
    grosorPiel DECIMAL(5,2) NOT NULL,
    insulina DECIMAL(6,2) NOT NULL,
    bmi DECIMAL(4,2) NOT NULL,
    diabetesPedigree DECIMAL(5,4) NOT NULL,
    edad INT NOT NULL,
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pacienteID) REFERENCES UsuarioSecundario(pacienteID) ON DELETE CASCADE,
    INDEX idx_paciente_fecha (pacienteID, fecha_registro)
);

-- =============================================
-- TABLA RESULTADO_IA
-- =============================================
CREATE TABLE RESULTADO_IA (
    resultadoID INT PRIMARY KEY AUTO_INCREMENT,
    probabilidadPadecer DECIMAL(5,4) NOT NULL,
    datosID INT NOT NULL UNIQUE,
    fecha_prediccion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (datosID) REFERENCES DATOS_CLINICOS(datosID) ON DELETE CASCADE,
    INDEX idx_datos (datosID)
);

-- =============================================
-- VISTAS
-- =============================================
CREATE VIEW vw_datos_completos AS
SELECT 
    up.usuarioID,
    up.nombre AS nombre_principal,
    up.correo,
    us.pacienteID,
    us.nombre AS nombre_paciente,
    us.sexo,
    us.fechaNacimiento,
    us.parentesco,
    TIMESTAMPDIFF(YEAR, us.fechaNacimiento, CURDATE()) AS edad_actual,
    dc.datosID,
    dc.embarazos,
    dc.glucosa,
    dc.presionSangina,
    dc.grosorPiel,
    dc.insulina,
    dc.bmi,
    dc.diabetesPedigree,
    dc.edad AS edad_medicion,
    dc.fecha_registro AS fecha_medicion,
    ri.probabilidadPadecer,
    ri.fecha_prediccion
FROM UsuarioPrincipal up
INNER JOIN UsuarioSecundario us ON up.usuarioID = us.usuarioPrincipalID
LEFT JOIN DATOS_CLINICOS dc ON us.pacienteID = dc.pacienteID
LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID;

CREATE VIEW vw_dashboard_principal AS
SELECT 
    up.usuarioID,
    up.nombre,
    up.correo,
    COUNT(DISTINCT us.pacienteID) AS total_pacientes,
    COUNT(DISTINCT dc.datosID) AS total_mediciones,
    MAX(dc.fecha_registro) AS ultima_medicion,
    AVG(ri.probabilidadPadecer) AS riesgo_promedio
FROM UsuarioPrincipal up
LEFT JOIN UsuarioSecundario us ON up.usuarioID = us.usuarioPrincipalID
LEFT JOIN DATOS_CLINICOS dc ON us.pacienteID = dc.pacienteID
LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID
GROUP BY up.usuarioID, up.nombre, up.correo;

CREATE VIEW vw_ultimos_resultados_pacientes AS
SELECT 
    us.pacienteID,
    us.nombre AS nombre_paciente,
    us.sexo,
    us.fechaNacimiento,
    TIMESTAMPDIFF(YEAR, us.fechaNacimiento, CURDATE()) AS edad,
    us.parentesco,
    up.nombre AS nombre_principal,
    dc.glucosa,
    dc.bmi,
    dc.presionSangina,
    ri.probabilidadPadecer,
    dc.fecha_registro AS fecha_medicion
FROM UsuarioSecundario us
JOIN UsuarioPrincipal up ON us.usuarioPrincipalID = up.usuarioID
LEFT JOIN DATOS_CLINICOS dc ON us.pacienteID = dc.pacienteID
LEFT JOIN RESULTADO_IA ri ON dc.datosID = ri.datosID
WHERE (us.pacienteID, dc.fecha_registro) IN (
    SELECT pacienteID, MAX(fecha_registro)
    FROM DATOS_CLINICOS
    GROUP BY pacienteID
) OR dc.fecha_registro IS NULL;

-- =============================================
-- PROCEDIMIENTOS ALMACENADOS
-- =============================================
DELIMITER //

CREATE PROCEDURE sp_registrar_principal(
    IN p_nombre VARCHAR(100),
    IN p_sexo ENUM('M','F','Otro'),
    IN p_fechaNacimiento DATE,
    IN p_domicilio VARCHAR(255),
    IN p_celular VARCHAR(20),
    IN p_correo VARCHAR(100),
    IN p_contraseña VARCHAR(255)
)
BEGIN
    INSERT INTO UsuarioPrincipal (
        nombre, sexo, fechaNacimiento, domicilio, celular, correo, contraseña
    ) VALUES (
        p_nombre, p_sexo, p_fechaNacimiento, p_domicilio, p_celular, p_correo, p_contraseña
    );
    
    SELECT LAST_INSERT_ID() AS nuevo_usuarioID;
END //

CREATE PROCEDURE sp_registrar_secundario(
    IN p_usuarioPrincipalID INT,
    IN p_nombre VARCHAR(100),
    IN p_sexo ENUM('M','F','Otro'),
    IN p_fechaNacimiento DATE,
    IN p_domicilio VARCHAR(255),
    IN p_celular VARCHAR(20),
    IN p_parentesco VARCHAR(50)
)
BEGIN
    INSERT INTO UsuarioSecundario (
        usuarioPrincipalID, nombre, sexo, fechaNacimiento, domicilio, celular, parentesco
    ) VALUES (
        p_usuarioPrincipalID, p_nombre, p_sexo, p_fechaNacimiento, p_domicilio, p_celular, p_parentesco
    );
    
    SELECT LAST_INSERT_ID() AS nuevo_pacienteID;
END //

CREATE PROCEDURE sp_registrar_datos_clinicos(
    IN p_pacienteID INT,
    IN p_embarazos INT,
    IN p_glucosa DECIMAL(5,2),
    IN p_presionSangina DECIMAL(5,2),
    IN p_grosorPiel DECIMAL(5,2),
    IN p_insulina DECIMAL(6,2),
    IN p_bmi DECIMAL(4,2),
    IN p_diabetesPedigree DECIMAL(5,4)
)
BEGIN
    DECLARE v_edad INT;
    
    SELECT TIMESTAMPDIFF(YEAR, fechaNacimiento, CURDATE()) INTO v_edad
    FROM UsuarioSecundario
    WHERE pacienteID = p_pacienteID;
    
    INSERT INTO DATOS_CLINICOS (
        pacienteID, embarazos, glucosa, presionSangina, grosorPiel,
        insulina, bmi, diabetesPedigree, edad
    ) VALUES (
        p_pacienteID, p_embarazos, p_glucosa, p_presionSangina, p_grosorPiel,
        p_insulina, p_bmi, p_diabetesPedigree, v_edad
    );
    
    SELECT LAST_INSERT_ID() AS nuevos_datosID;
END //

CREATE TRIGGER trg_after_insert_datos_clinicos
AFTER INSERT ON DATOS_CLINICOS
FOR EACH ROW
BEGIN
    DECLARE v_probabilidad DECIMAL(5,4);
    SET v_probabilidad = RAND() * 0.8;
    
    INSERT INTO RESULTADO_IA (probabilidadPadecer, datosID)
    VALUES (v_probabilidad, NEW.datosID);
END //

DELIMITER ;

-- =============================================
-- DATOS DE EJEMPLO
-- =============================================

-- Insertar usuarios principales
INSERT INTO UsuarioPrincipal (nombre, sexo, fechaNacimiento, domicilio, celular, correo, contraseña) VALUES
('María González', 'F', '1985-03-15', 'Calle Principal 123', '555-1234', 'maria@email.com', '$2b$10$ejemplo_hash_para_demo_1'),
('Carlos Rodríguez', 'M', '1978-07-22', 'Avenida Central 456', '555-5678', 'carlos@email.com', '$2b$10$ejemplo_hash_para_demo_2');

-- Insertar usuarios secundarios
INSERT INTO UsuarioSecundario (usuarioPrincipalID, nombre, sexo, fechaNacimiento, domicilio, celular, parentesco) VALUES
(1, 'Elena Ramírez', 'F', '1950-11-08', 'Calle Principal 123', '555-1234', 'Madre'),
(1, 'Luis González', 'M', '2015-05-20', 'Calle Principal 123', '555-1234', 'Hijo'),
(1, 'Ana González', 'F', '1988-09-12', 'Calle Principal 123', '555-1234', 'Hermana'),
(2, 'Roberto Méndez', 'M', '1945-02-28', 'Avenida Central 456', '555-5678', 'Padre'),
(2, 'Sofía Rodríguez', 'F', '2018-11-03', 'Avenida Central 456', '555-5678', 'Hija');

-- Insertar datos clínicos
INSERT INTO DATOS_CLINICOS (pacienteID, embarazos, glucosa, presionSangina, grosorPiel, insulina, bmi, diabetesPedigree, edad) VALUES
(1, 3, 148.0, 85.0, 28.0, 95.0, 29.5, 0.627, 73),
(1, 3, 142.0, 82.0, 26.0, 88.0, 28.9, 0.615, 73),
(2, 0, 95.0, 65.0, 18.0, 0.0, 17.8, 0.145, 8),
(4, 0, 158.0, 92.0, 32.0, 120.0, 32.1, 0.856, 78);
