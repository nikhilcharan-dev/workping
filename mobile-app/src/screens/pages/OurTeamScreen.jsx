import React from "react";
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ScreenWrapper from "@/components/layout/ScreenWrapper";
import Card from "@/components/Card";
import Avatar from "@/components/Avatar";
import { useTheme } from "@/theme";

const team = [
    {
        id: "1",
        name: "Chanuboyina Nagendra",
        role: "Frontend UI",
        email: "chanuboyinanagendra@gmail.com",
        linkedin: "https://in.linkedin.com/in/chanuboyina-nagendra-8b52b32b4",
        portfolio: "https://chanuboyinanagendra.engineer",
    },
    {
        id: "2",
        name: "Shaik Umar",
        role: "Backend",
        email: "shaikumar14363@gmail.com",
        linkedin: "https://www.linkedin.com/in/shaik-umar-400947290",
        portfolio: "https://shaikumar0.github.io/portfolio/MyWorld",
    },
    {
        id: "3",
        name: "Chavali J S R Vinayaka Gopala Krishna",
        role: "Frontend UI",
        email: "chavalijsrvinayak09@gmail.com",
        linkedin: "https://www.linkedin.com/in/j-s-r-vinayaka-gopala-krishna-chavali-41916a291/",
        portfolio: "https://vinayakagopalakrishna123.github.io/portfolio/",
    },
    {
        id: "4",
        name: "Aravelli Vishnu Priya",
        role: "Frontend UI",
        email: "aravellivishnupriya@gmail.com",
        linkedin: "https://www.linkedin.com/in/vishnu-priya-aravelli-654173291",
        portfolio: "https://vishnupriya742.github.io/Vishnu_priya_portfolio/",
    },
    {
        id: "5",
        name: "Gollapalli Nikhil Charan",
        role: "FullStack",
        email: "nikhilcharangollapalli@gmail.com",
        linkedin: "https://www.linkedin.com/in/shadow01/",
        portfolio: "https://nixquest.me",
    },
    {
        id: "6",
        name: "Lova Reddy Dwarampudi",
        role: "Backend",
        email: "lovareddy.stu@gmail.com",
        linkedin: "https://www.linkedin.com/in/lovareddy/",
        portfolio: "https://lokiverse.dev",
    },
];

const OurTeamScreen = () => {
    const { colors } = useTheme();

    const openLink = (url) => {
        if (url) Linking.openURL(url);
    };

    const renderItem = ({ item }) => (
        <Card style={styles.memberCard}>
            <Card.Body style={styles.memberBody}>
                <Avatar name={item.name} size={56} />
                <Text style={[styles.memberName, { color: colors.textPrimary }]}>{item.name}</Text>
                <Text style={[styles.memberRole, { color: colors.primary }]}>{item.role}</Text>
                <View style={styles.links}>
                    {item.email && (
                        <TouchableOpacity
                            onPress={() => openLink(`mailto:${item.email}`)}
                            style={[styles.linkBtn, { backgroundColor: colors.primary + "18" }]}
                        >
                            <Ionicons name="mail-outline" size={15} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    {item.linkedin && (
                        <TouchableOpacity
                            onPress={() => openLink(item.linkedin)}
                            style={[styles.linkBtn, { backgroundColor: colors.primary + "18" }]}
                        >
                            <Ionicons name="logo-linkedin" size={15} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                    {item.portfolio && (
                        <TouchableOpacity
                            onPress={() => openLink(item.portfolio)}
                            style={[styles.linkBtn, { backgroundColor: colors.primary + "18" }]}
                        >
                            <Ionicons name="globe-outline" size={15} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </Card.Body>
        </Card>
    );

    return (
        <ScreenWrapper scrollable={false} showFooter={false}>
            <View style={styles.header}>
                <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Our Team</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Meet the people behind WorkPing</Text>
            </View>
            <FlatList
                data={team}
                keyExtractor={(item) => item.id}
                numColumns={2}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.colWrapper}
                renderItem={renderItem}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: { paddingHorizontal: 16, paddingVertical: 12, alignItems: "center" },
    pageTitle: { fontSize: 22, fontWeight: "700" },
    subtitle: { fontSize: 13, marginTop: 4 },
    listContent: { padding: 16, paddingTop: 0 },
    colWrapper: { gap: 12 },
    memberCard: { flex: 1, marginBottom: 12 },
    memberBody: { alignItems: "center", paddingVertical: 16 },
    memberName: { fontSize: 13, fontWeight: "600", marginTop: 10, textAlign: "center" },
    memberRole: { fontSize: 11, fontWeight: "500", marginTop: 3, textAlign: "center" },
    links: { flexDirection: "row", gap: 8, marginTop: 10 },
    linkBtn: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
});

export default OurTeamScreen;
