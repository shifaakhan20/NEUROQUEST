package com.example;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.annotation.WebServlet;
import jakarta.servlet.http.HttpServlet;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;

import org.mindrot.jbcrypt.BCrypt;

import java.io.IOException;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Map;

@WebServlet("/api/auth/login")
public class AuthLoginServlet extends HttpServlet {

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
                || username.length() > 30
                || password.length() > 72) {

            response.setStatus(HttpServletResponse.SC_BAD_REQUEST);
            mapper.writeValue(response.getWriter(),
                Map.of("message", "Invalid username or password"));
            return;
        }

        String sql =
            "SELECT player_id, username, password_hash "
            + "FROM players WHERE username = ?";

        try (Connection connection = DatabaseUtil.getConnection();
             PreparedStatement statement =
                 connection.prepareStatement(sql)) {

            statement.setString(1, username);

            try (ResultSet result = statement.executeQuery()) {

                if (!result.next()) {
                    response.setStatus(
                        HttpServletResponse.SC_UNAUTHORIZED
                    );
                    mapper.writeValue(response.getWriter(),
                        Map.of("message",
                            "Invalid username or password"));
                    return;
                }

                String storedHash =
                    result.getString("password_hash");

                if (storedHash == null
                        || !BCrypt.checkpw(password, storedHash)) {
                    response.setStatus(
                        HttpServletResponse.SC_UNAUTHORIZED
                    );
                    mapper.writeValue(response.getWriter(),
                        Map.of("message",
                            "Invalid username or password"));
                    return;
                }

                int playerId = result.getInt("player_id");
                String verifiedUsername =
                    result.getString("username");

                // Replace any pre-login session to prevent
                // session fixation.
                HttpSession oldSession = request.getSession(false);
                if (oldSession != null) {
                    oldSession.invalidate();
                }

                HttpSession session = request.getSession(true);
                session.setAttribute("playerId", playerId);
                session.setAttribute("username", verifiedUsername);
                session.setMaxInactiveInterval(30 * 60);

                mapper.writeValue(response.getWriter(),
                    Map.of(
                        "message", "Login successful",
                        "playerId", playerId,
                        "username", verifiedUsername
                    ));
            }

        } catch (SQLException e) {
            getServletContext().log("Login database error", e);
            response.setStatus(
                HttpServletResponse.SC_INTERNAL_SERVER_ERROR
            );
            mapper.writeValue(response.getWriter(),
                Map.of("message", "Unable to log in"));
        }
    }
}

