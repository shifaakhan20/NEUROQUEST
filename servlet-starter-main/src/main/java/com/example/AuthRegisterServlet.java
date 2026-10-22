package com.example;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.mindrot.jbcrypt.BCrypt;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.Map;

@WebServlet("/api/auth/register")
public class AuthRegisterServlet extends HttpServlet {

    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void doOptions(
            HttpServletRequest request,
            HttpServletResponse response) {

        CorsUtil.configure(request, response);
        response.setStatus(HttpServletResponse.SC_NO_CONTENT);
    }

    @Override
    protected void doPost(
            HttpServletRequest request,
            HttpServletResponse response) throws IOException {

        CorsUtil.configure(request, response);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");

        Map<String, String> body;

        try {
            body = mapper.readValue(
                request.getInputStream(),
                mapper.getTypeFactory().constructMapType(
                    Map.class, String.class, String.class
                )
            );
        } catch (Exception e) {
            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            mapper.writeValue(response.getWriter(),
                Map.of("message", "Invalid JSON request"));
            return;
        }

        String username = body.get("username");
        String password = body.get("password");

        if (username == null || password == null
                || !username.matches("[A-Za-z0-9_]{3,30}")
                || password.length() < 8
                || password.length() > 72) {

            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            mapper.writeValue(response.getWriter(),
                Map.of("message",
                    "Username must be 3-30 letters, numbers or underscores; "
                    + "password must be 8-72 characters."));
            return;
        }

        String passwordHash = BCrypt.hashpw(
            password, BCrypt.gensalt(12)
        );

        String sql =
            "INSERT INTO players (username, password_hash) VALUES (?, ?)";

        try (Connection connection = DatabaseUtil.getConnection();
             PreparedStatement statement =
                 connection.prepareStatement(sql)) {

            statement.setString(1, username);
            statement.setString(2, passwordHash);
            statement.executeUpdate();

            response.setStatus(HttpServletResponse.SC_CREATED);
            mapper.writeValue(response.getWriter(),
                Map.of("message", "Account created successfully"));

        } catch (SQLException e) {
            if (e.getSQLState() != null
                    && e.getSQLState().startsWith("23")) {
                response.setStatus(
                    HttpServletResponse.SC_CONFLICT
                );
                mapper.writeValue(response.getWriter(),
                    Map.of("message", "Username already exists"));
            } else {
                getServletContext().log(
                    "Registration database error", e
                );
                response.setStatus(
                    HttpServletResponse.SC_INTERNAL_SERVER_ERROR
                );
                mapper.writeValue(response.getWriter(),
                    Map.of("message", "Unable to create account"));
            }
        }
    }
}

