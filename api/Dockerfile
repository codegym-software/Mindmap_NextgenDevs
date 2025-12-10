FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app

# Cau hinh Maven mirror de tang toc va tranh timeout
COPY settings.xml /root/.m2/settings.xml

# Tang timeout cho Maven
ENV MAVEN_OPTS="-Dmaven.artifact.threads=5 -Dhttp.socket.timeout=300000 -Dhttp.connection.timeout=300000"

COPY pom.xml .
COPY . .
RUN mvn -q -e -B -DskipTests clean package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/mindmap-api-*.jar /app/app.jar
EXPOSE 8081
ENTRYPOINT ["java","-jar","/app/app.jar"]
